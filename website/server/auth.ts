import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { sessions, users, type UserRow } from "./store";

const COOKIE = "kc_session";
const KEYLEN = 64;

/** scrypt with a per-user salt; the cost parameters are the Node defaults. */
function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, KEYLEN).toString("hex");
}

function verifyPassword(password: string, salt: string, expected: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt), "hex");
  const wanted = Buffer.from(expected, "hex");
  // Length differs only on corrupt rows, and timingSafeEqual throws on that.
  if (actual.length !== wanted.length) return false;
  return timingSafeEqual(actual, wanted);
}

/** Only a hash of the session token is stored, so a database copy is not a key ring. */
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function setSessionCookie(res: Response, token: string, maxAgeDays = 30) {
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAgeDays * 86400}`,
  ];
  // The dev server is plain http on localhost, where Secure would drop the cookie.
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(res: Response) {
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

export interface PublicUser {
  id: string;
  email: string;
  createdAt: string;
}

const toPublic = (u: UserRow): PublicUser => ({
  id: u.id,
  email: u.email,
  createdAt: u.created_at,
});

export function currentUser(req: Request): UserRow | null {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  return sessions.userFor(tokenHash(token)) ?? null;
}

/** Guard for everything under /api/coachings. */
export function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = currentUser(req);
  if (!user) {
    res.status(401).json({ success: false, error: "Nicht angemeldet." });
    return;
  }
  (req as any).user = user;
  next();
}

function startSession(res: Response, userId: string) {
  const token = randomBytes(32).toString("hex");
  sessions.insert(tokenHash(token), userId);
  setSessionCookie(res, token);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function registerUser(req: Request, res: Response) {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ success: false, error: "Bitte eine gültige E-Mail-Adresse angeben." });
    return;
  }
  if (password.length < 8) {
    res
      .status(400)
      .json({ success: false, error: "Das Passwort braucht mindestens 8 Zeichen." });
    return;
  }
  if (users.byEmail(email)) {
    res.status(409).json({ success: false, error: "Für diese E-Mail gibt es bereits ein Konto." });
    return;
  }

  const salt = randomBytes(16).toString("hex");
  const row: UserRow = {
    id: randomUUID(),
    email,
    password_hash: hashPassword(password, salt),
    salt,
    created_at: new Date().toISOString(),
  };
  users.insert(row);
  startSession(res, row.id);
  res.json({ success: true, user: toPublic(row) });
}

export function loginUser(req: Request, res: Response) {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const user = users.byEmail(email);

  // Same message either way, so this cannot be used to test which addresses exist.
  const deny = () =>
    res.status(401).json({ success: false, error: "E-Mail oder Passwort stimmt nicht." });

  if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
    deny();
    return;
  }

  startSession(res, user.id);
  res.json({ success: true, user: toPublic(user) });
}

export function logoutUser(req: Request, res: Response) {
  const token = readCookie(req, COOKIE);
  if (token) sessions.remove(tokenHash(token));
  clearSessionCookie(res);
  res.json({ success: true });
}

export function meHandler(req: Request, res: Response) {
  const user = currentUser(req);
  res.json({ success: true, user: user ? toPublic(user) : null });
}
