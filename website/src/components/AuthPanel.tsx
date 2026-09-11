import React, { useState } from "react";
import { Loader2, LogIn, UserPlus, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useLang, useT, serverMessage } from "../i18n";

export interface AccountUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthPanelProps {
  onAuthenticated: (user: AccountUser) => void;
  /** Shown above the form to explain why the account is being asked for. */
  reason?: string;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({ onAuthenticated, reason }) => {
  const { lang } = useLang();
  const t = useT();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register" ? { name, email, password } : { email, password }
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.error ? serverMessage(data.error, lang) : t("Anmeldung fehlgeschlagen.", "Sign-in failed.")
        );
      }
      onAuthenticated(data.user);
    } catch (err: any) {
      setError(err.message || t("Anmeldung fehlgeschlagen.", "Sign-in failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl bg-[#ffffff] border border-[#2e2c27]/[0.08] p-6 sm:p-9 shadow-sm max-w-md mx-auto">
      <h3 className="text-xl sm:text-2xl font-black uppercase tracking-[-0.02em] text-[#2e2c27]">
        {mode === "login" ? t("Anmelden", "Sign in") : t("Konto erstellen", "Create account")}
      </h3>
      <p className="mt-2 text-sm text-[#6f6759] leading-relaxed">
        {reason ??
          (mode === "register"
            ? t(
                "Benutzername, E-Mail und Passwort — mehr wird nicht gespeichert.",
                "Username, email and password — nothing more is stored."
              )
            : t("Mit E-Mail und Passwort anmelden.", "Sign in with email and password."))}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "register" && (
          <div>
            <label
              htmlFor="auth-name"
              className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-[#6f6759] mb-1.5"
            >
              {t("Benutzername", "Username")}
            </label>
            <input
              id="auth-name"
              type="text"
              required
              minLength={2}
              maxLength={40}
              autoComplete="nickname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#faf6ef] border border-[#2e2c27]/15 rounded-xl px-4 py-3 text-[15px] text-[#2e2c27] placeholder-[#6f6759] focus:outline-none focus:border-[#c23a20]"
              placeholder={t("Wie sollen wir dich nennen?", "What should we call you?")}
            />
          </div>
        )}

        <div>
          <label
            htmlFor="auth-email"
            className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-[#6f6759] mb-1.5"
          >
            {t("E-Mail", "Email")}
          </label>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#faf6ef] border border-[#2e2c27]/15 rounded-xl px-4 py-3 text-[15px] text-[#2e2c27] placeholder-[#6f6759] focus:outline-none focus:border-[#c23a20]"
            placeholder={t("du@example.com", "you@example.com")}
          />
        </div>

        <div>
          <label
            htmlFor="auth-password"
            className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-[#6f6759] mb-1.5"
          >
            {t("Passwort", "Password")}
          </label>
          <div className="relative">
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#faf6ef] border border-[#2e2c27]/15 rounded-xl pl-4 pr-12 py-3 text-[15px] text-[#2e2c27] placeholder-[#6f6759] focus:outline-none focus:border-[#c23a20]"
              placeholder={
                mode === "register" ? t("mindestens 8 Zeichen", "at least 8 characters") : "••••••••"
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={
                showPassword ? t("Passwort verbergen", "Hide password") : t("Passwort anzeigen", "Show password")
              }
              aria-pressed={showPassword}
              title={
                showPassword ? t("Passwort verbergen", "Hide password") : t("Passwort anzeigen", "Show password")
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[#6f6759] hover:text-[#2e2c27] hover:bg-[#eee8dd] transition"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="flex items-start gap-2 text-sm text-[#8f2d1a] bg-[#fbeae6] border border-[#c33418]/30 rounded-xl px-3.5 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full px-6 py-3.5 rounded-full bg-[#2e2c27] hover:bg-[#1f1d19] disabled:opacity-60 text-[#faf6ef] text-base font-semibold transition inline-flex items-center justify-center gap-2.5"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === "login" ? (
            <LogIn className="w-4 h-4" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          <span>{mode === "login" ? t("Anmelden", "Sign in") : t("Konto erstellen", "Create account")}</span>
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
        }}
        className="mt-5 w-full text-sm text-[#6f6759] hover:text-[#2e2c27] transition"
      >
        {mode === "login"
          ? t("Noch kein Konto? Jetzt erstellen", "No account yet? Create one")
          : t("Schon ein Konto? Zur Anmeldung", "Already have an account? Sign in")}
      </button>
    </section>
  );
};
