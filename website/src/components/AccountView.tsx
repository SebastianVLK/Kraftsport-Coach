import React from "react";
import { LogOut, Dumbbell, CalendarCheck, TrendingUp } from "lucide-react";
import type { AccountUser } from "./AuthPanel";
import { CoachingsView, type CoachingSummary } from "./CoachingsView";

interface AccountViewProps {
  user: AccountUser;
  coachings: CoachingSummary[];
  loading: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onLogout: () => void;
  openingId: string | null;
}

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Noch wach";
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Hallo";
  return "Guten Abend";
};

export const AccountView: React.FC<AccountViewProps> = ({
  user,
  coachings,
  loading,
  onOpen,
  onDelete,
  onLogout,
  openingId,
}) => {
  const trainingDays = new Set(coachings.map((c) => dayKey(c.created_at))).size;
  const clean = coachings.filter((c) => c.urteil === "gut").length;

  const memberSince = new Date(user.createdAt).toLocaleDateString("de-CH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const stats = [
    { icon: Dumbbell, label: "Coachings", value: coachings.length },
    { icon: CalendarCheck, label: "Trainingstage", value: trainingDays },
    { icon: TrendingUp, label: "Urteil „gut“", value: clean },
  ];

  return (
    <div className="space-y-5">
      {/* Same stamped block as the rest of the site, inverted for the profile */}
      <section className="rounded-3xl bg-[#2e2c27] p-6 sm:p-9 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <span className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#faf6ef] text-[#2e2c27] flex items-center justify-center text-2xl sm:text-3xl font-black uppercase">
              {user.name.slice(0, 2)}
            </span>
            <div className="min-w-0">
              <span className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-[#faf6ef]/60">
                {greeting()}
              </span>
              <h2 className="mt-1 font-black uppercase tracking-[-0.02em] leading-[0.95] text-3xl sm:text-5xl text-[#faf6ef] truncate">
                {user.name}
              </h2>
              <p className="mt-2 text-sm text-[#faf6ef]/70 truncate">
                {user.email} · dabei seit {memberSince}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="shrink-0 self-start px-5 py-2.5 rounded-full bg-[#faf6ef]/10 hover:bg-[#faf6ef]/20 text-[#faf6ef] text-sm font-semibold transition inline-flex items-center gap-2 border border-[#faf6ef]/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Abmelden</span>
          </button>
        </div>

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
