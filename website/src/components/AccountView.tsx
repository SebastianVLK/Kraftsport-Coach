import React, { useState } from "react";
import {
  LogOut,
  Dumbbell,
  CalendarCheck,
  TrendingUp,
  Pencil,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import type { AccountUser } from "./AuthPanel";
import { CoachingsView, type CoachingSummary } from "./CoachingsView";
import { useLang, useT, localeOf, serverMessage, verdictLabel } from "../i18n";

interface AccountViewProps {
  user: AccountUser;
  coachings: CoachingSummary[];
  loading: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onLogout: () => void;
  onUpdated: (user: AccountUser) => void;
  openingId: string | null;
}

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const greeting = (t: (de: string, en: string) => string) => {
  const h = new Date().getHours();
  if (h < 5) return t("Noch wach", "Still up");
  if (h < 11) return t("Guten Morgen", "Good morning");
  if (h < 18) return t("Hallo", "Hello");
  return t("Guten Abend", "Good evening");
};

/** Inline editor inside the dark profile block, so it keeps the same skin. */
const AccountEditor: React.FC<{
  user: AccountUser;
  onDone: (user: AccountUser) => void;
}> = ({ user, onDone }) => {
  const { lang } = useLang();
  const t = useT();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The current password is only demanded for the changes that need it.
  const sensitive = email.trim().toLowerCase() !== user.email || newPassword.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          newPassword: newPassword || undefined,
          currentPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.error ? serverMessage(data.error, lang) : t("Speichern fehlgeschlagen.", "Saving failed.")
        );
      }
      onDone(data.user);
    } catch (err: any) {
      setError(err.message || t("Speichern fehlgeschlagen.", "Saving failed."));
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full bg-[#faf6ef]/10 border border-[#faf6ef]/25 rounded-xl px-4 py-3 text-[15px] text-[#faf6ef] placeholder-[#faf6ef]/40 focus:outline-none focus:border-[#faf6ef]/70";
  const label =
    "block text-[11px] uppercase tracking-[0.14em] font-semibold text-[#faf6ef]/60 mb-1.5";

  return (
    <form
      onSubmit={submit}
      className="mt-7 pt-7 border-t border-[#faf6ef]/15 grid gap-4 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="edit-name" className={label}>
          {t("Benutzername", "Username")}
        </label>
        <input
          id="edit-name"
          className={field}
          value={name}
          minLength={2}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="edit-email" className={label}>
          {t("E-Mail", "Email")}
        </label>
        <input
          id="edit-email"
          type="email"
          className={field}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="edit-new-password" className={label}>
          {t("Neues Passwort", "New password")}{" "}
          <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <div className="relative">
          <input
            id="edit-new-password"
            type={show ? "text" : "password"}
            className={`${field} pr-12`}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t("leer lassen, um es zu behalten", "leave empty to keep it")}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={
              show ? t("Passwort verbergen", "Hide password") : t("Passwort anzeigen", "Show password")
            }
            aria-pressed={show}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[#faf6ef]/60 hover:text-[#faf6ef] hover:bg-[#faf6ef]/10 transition"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="edit-current-password" className={label}>
          {t("Aktuelles Passwort", "Current password")}
        </label>
        <input
          id="edit-current-password"
          type="password"
          className={field}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required={sensitive}
          placeholder={
            sensitive
              ? t("zur Bestätigung nötig", "needed to confirm")
              : t("nur bei E-Mail oder Passwort nötig", "only needed for email or password")
          }
        />
      </div>

      {error && (
        <p className="sm:col-span-2 flex items-start gap-2 text-sm text-[#ffb4a2] bg-[#c33418]/20 border border-[#c33418]/40 rounded-xl px-3.5 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}

      <div className="sm:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="px-6 py-3 rounded-full bg-[#faf6ef] hover:bg-[#e8e2d6] disabled:opacity-60 text-[#2e2c27] text-sm font-semibold transition inline-flex items-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{t("Änderungen speichern", "Save changes")}</span>
        </button>
        {newPassword && (
          <span className="text-xs text-[#faf6ef]/60">
            {t("Andere Geräte werden abgemeldet.", "Other devices will be signed out.")}
          </span>
        )}
      </div>
    </form>
  );
};

export const AccountView: React.FC<AccountViewProps> = ({
  user,
  coachings,
  loading,
  onOpen,
  onDelete,
  onLogout,
  onUpdated,
  openingId,
}) => {
  const { lang } = useLang();
  const t = useT();
  const [editing, setEditing] = useState(false);
  const trainingDays = new Set(coachings.map((c) => dayKey(c.created_at))).size;
  const clean = coachings.filter((c) => c.urteil === "gut").length;

  const memberSince = new Date(user.createdAt).toLocaleDateString(localeOf(lang), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const good = verdictLabel("gut", lang).toLowerCase();
  const stats = [
    { icon: Dumbbell, label: "Coachings", value: coachings.length },
    { icon: CalendarCheck, label: t("Trainingstage", "Training days"), value: trainingDays },
    { icon: TrendingUp, label: t(`Urteil „${good}“`, `Verdict “${good}”`), value: clean },
  ];

  return (
    <div className="space-y-5">
      {/* Same stamped block as the rest of the site, inverted for the profile */}
      <section className="rounded-3xl bg-[#2e2c27] p-6 sm:p-9 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div className="min-w-0">
            <span className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-[#faf6ef]/60">
              {greeting(t)}
            </span>
            <h2 className="mt-1 font-black uppercase tracking-[-0.02em] leading-[0.95] text-3xl sm:text-5xl text-[#faf6ef] truncate">
              {user.name}
            </h2>
            <p className="mt-2 text-sm text-[#faf6ef]/70">
              {t(`dabei seit ${memberSince}`, `member since ${memberSince}`)}
            </p>
          </div>

          <div className="shrink-0 self-start flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              className="px-5 py-2.5 rounded-full bg-[#faf6ef]/10 hover:bg-[#faf6ef]/20 text-[#faf6ef] text-sm font-semibold transition inline-flex items-center gap-2 border border-[#faf6ef]/20"
            >
              {editing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              <span>{editing ? t("Schliessen", "Close") : t("Konto bearbeiten", "Edit account")}</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-5 py-2.5 rounded-full bg-[#faf6ef]/10 hover:bg-[#faf6ef]/20 text-[#faf6ef] text-sm font-semibold transition inline-flex items-center gap-2 border border-[#faf6ef]/20"
            >
              <LogOut className="w-4 h-4" />
              <span>{t("Abmelden", "Sign out")}</span>
            </button>
          </div>
        </div>

        {editing && (
          <AccountEditor
            user={user}
            onDone={(u) => {
              onUpdated(u);
              setEditing(false);
            }}
          />
        )}

        <dl className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
          {stats.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-2xl bg-[#faf6ef]/[0.07] border border-[#faf6ef]/15 px-4 py-4 sm:px-5"
            >
              <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] font-semibold text-[#faf6ef]/60">
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate">{label}</span>
              </dt>
              <dd className="mt-1.5 text-2xl sm:text-3xl font-black text-[#faf6ef] tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <CoachingsView
        coachings={coachings}
        loading={loading}
        onOpen={onOpen}
        onDelete={onDelete}
        openingId={openingId}
      />
    </div>
  );
};
