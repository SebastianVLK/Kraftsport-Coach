import React, { useState } from "react";
import { Loader2, LogIn, UserPlus, AlertCircle } from "lucide-react";

export interface AccountUser {
  id: string;
  email: string;
  createdAt: string;
}

interface AuthPanelProps {
  onAuthenticated: (user: AccountUser) => void;
  /** Shown above the form to explain why the account is being asked for. */
  reason?: string;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({ onAuthenticated, reason }) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Anmeldung fehlgeschlagen.");
      }
      onAuthenticated(data.user);
    } catch (err: any) {
      setError(err.message || "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl bg-[#ffffff] border border-[#2e2c27]/[0.08] p-6 sm:p-9 shadow-sm max-w-md mx-auto">
      <h3 className="text-xl sm:text-2xl font-black uppercase tracking-[-0.02em] text-[#2e2c27]">
        {mode === "login" ? "Anmelden" : "Konto erstellen"}
      </h3>
      <p className="mt-2 text-sm text-[#6f6759] leading-relaxed">
        {reason ?? "E-Mail und Passwort genügen — mehr wird nicht gespeichert."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="auth-email"
            className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-[#6f6759] mb-1.5"
          >
            E-Mail
          </label>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#faf6ef] border border-[#2e2c27]/15 rounded-xl px-4 py-3 text-[15px] text-[#2e2c27] placeholder-[#6f6759] focus:outline-none focus:border-[#c23a20]"
            placeholder="du@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="auth-password"
            className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-[#6f6759] mb-1.5"
          >
            Passwort
          </label>
          <input
            id="auth-password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#faf6ef] border border-[#2e2c27]/15 rounded-xl px-4 py-3 text-[15px] text-[#2e2c27] placeholder-[#6f6759] focus:outline-none focus:border-[#c23a20]"
            placeholder={mode === "register" ? "mindestens 8 Zeichen" : "••••••••"}
          />
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
          <span>{mode === "login" ? "Anmelden" : "Konto erstellen"}</span>
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
          ? "Noch kein Konto? Jetzt erstellen"
          : "Schon ein Konto? Zur Anmeldung"}
      </button>
    </section>
  );
};
