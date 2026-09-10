import { DatabaseSync } from "node:sqlite";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/**
 * Storage for accounts and saved coachings.
 *
 * node:sqlite ships with Node, so this needs no native module and no service
 * to run alongside the app.
 *
 * The file lives outside the checkout, in the usual per-user data folder. That
 * keeps accounts alive when the repository is re-cloned or deleted, and it
 * makes the location independent of the directory the server happens to be
 * started from — a path built from process.cwd() would silently create a
 * second, empty database.
 */
function resolveDataDir(): string {
  const override = process.env.COACH_DATA_DIR;
  if (override) return path.resolve(override);

  if (process.platform === "darwin") {
    return path.join(homedir(), "Library", "Application Support", "Kraftsport-Coach");
  }
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA ?? homedir(), "Kraftsport-Coach");
  }
  return path.join(
    process.env.XDG_DATA_HOME ?? path.join(homedir(), ".local", "share"),
    "kraftsport-coach"
  );
}

export const dataDir = resolveDataDir();
mkdirSync(dataDir, { recursive: true });

export const dbPath = path.join(dataDir, "coach.db");

// Carry over a database from the old in-project location, once.
const legacyPath = path.join(process.cwd(), "data", "coach.db");
if (!existsSync(dbPath) && existsSync(legacyPath)) {
  copyFileSync(legacyPath, dbPath);
  console.log(`[db] Bestehende Datenbank übernommen aus ${legacyPath}`);
}

export const db = new DatabaseSync(dbPath);
console.log(`[db] Konten und Coachings: ${dbPath}`);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt          TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS coachings (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    exercise   TEXT NOT NULL,
    urteil     TEXT NOT NULL,
    note       TEXT,
    payload    TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_coachings_user_date ON coachings(user_id, created_at DESC);
`);

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  created_at: string;
}

export interface CoachingRow {
  id: string;
  user_id: string;
  created_at: string;
  exercise: string;
  urteil: string;
  note: string | null;
  payload: string;
}

export const users = {
  byEmail(email: string): UserRow | undefined {
    return db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email.toLowerCase()) as unknown as UserRow | undefined;
  },
  byId(id: string): UserRow | undefined {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as unknown as UserRow | undefined;
  },
  insert(row: UserRow) {
    db.prepare(
      `INSERT INTO users (id, email, password_hash, salt, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(row.id, row.email.toLowerCase(), row.password_hash, row.salt, row.created_at);
  },
};

export const sessions = {
  insert(tokenHash: string, userId: string, days = 30) {
    const now = new Date();
    const expires = new Date(now.getTime() + days * 86400_000);
    db.prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
       VALUES (?, ?, ?, ?)`
    ).run(tokenHash, userId, now.toISOString(), expires.toISOString());
  },
  userFor(tokenHash: string): UserRow | undefined {
    const row = db
      .prepare(
        `SELECT u.* FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?`
      )
      .get(tokenHash, new Date().toISOString()) as unknown as UserRow | undefined;
    return row;
  },
  remove(tokenHash: string) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
  },
  pruneExpired() {
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
  },
};

export const coachings = {
  insert(row: CoachingRow) {
    db.prepare(
      `INSERT INTO coachings (id, user_id, created_at, exercise, urteil, note, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      row.id,
      row.user_id,
      row.created_at,
      row.exercise,
      row.urteil,
      row.note,
      row.payload
    );
  },
  /** Summaries for the list and the calendar — the payload stays behind. */
  listForUser(userId: string) {
    return db
      .prepare(
        `SELECT id, created_at, exercise, urteil, note
         FROM coachings WHERE user_id = ? ORDER BY created_at DESC`
      )
      .all(userId) as unknown as Omit<CoachingRow, "user_id" | "payload">[];
  },
  get(id: string, userId: string): CoachingRow | undefined {
    return db
      .prepare("SELECT * FROM coachings WHERE id = ? AND user_id = ?")
      .get(id, userId) as unknown as CoachingRow | undefined;
  },
  remove(id: string, userId: string): boolean {
    const res = db
      .prepare("DELETE FROM coachings WHERE id = ? AND user_id = ?")
      .run(id, userId);
    return Number(res.changes) > 0;
  },
};

sessions.pruneExpired();
