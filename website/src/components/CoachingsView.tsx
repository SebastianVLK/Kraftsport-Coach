import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useLang, useT, localeOf, verdictLabel } from "../i18n";

export interface CoachingSummary {
  id: string;
  created_at: string;
  exercise: string;
  urteil: string;
  note: string | null;
}

interface CoachingsViewProps {
  coachings: CoachingSummary[];
  loading: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  openingId: string | null;
}

const VERDICT_STYLE: Record<string, { dot: string; chip: string }> = {
  gut: { dot: "#5f6b25", chip: "bg-[#5f6b25] text-[#faf6ef]" },
  brauchbar: { dot: "#8f6413", chip: "bg-[#8f6413] text-[#faf6ef]" },
  mangelhaft: { dot: "#c33418", chip: "bg-[#c33418] text-[#faf6ef]" },
  nicht_beurteilbar: { dot: "#6f6759", chip: "bg-[#eee8dd] text-[#2e2c27]" },
};

const style = (v: string) => VERDICT_STYLE[v] ?? VERDICT_STYLE.nicht_beurteilbar;

/** Local calendar day, so a late-evening session lands on the day it felt like. */
const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const timeOf = (iso: string, locale: string) =>
  new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

const longDate = (key: string, locale: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const CoachingsView: React.FC<CoachingsViewProps> = ({
  coachings,
  loading,
  onOpen,
  onDelete,
  openingId,
}) => {
  const { lang } = useLang();
  const t = useT();
  const locale = localeOf(lang);
  const weekdays = t("Mo Di Mi Do Fr Sa So", "Mo Tu We Th Fr Sa Su").split(" ");
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const dayDetailRef = useRef<HTMLDivElement>(null);

  // The day's coachings open below the grid, which is easy to miss on a tall
  // calendar — bring them into view when a day is picked.
  useEffect(() => {
    if (selectedDay) {
      dayDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedDay]);

  const byDay = useMemo(() => {
    const map = new Map<string, CoachingSummary[]>();
    for (const c of coachings) {
      const k = dayKey(c.created_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return map;
  }, [coachings]);

  // Monday-first grid covering the visible month
  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= days; d++) {
      out.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const todayKey = dayKey(new Date().toISOString());
  const selected = selectedDay ? byDay.get(selectedDay) ?? [] : [];

  const Row: React.FC<{ c: CoachingSummary }> = ({ c }) => {
    const s = style(c.urteil);
    return (
      <div className="flex items-center gap-3 py-3.5">
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${s.chip}`}>
          {verdictLabel(c.urteil, lang)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#2e2c27] truncate">{c.exercise}</p>
          <p className="text-xs text-[#6f6759]">
            {timeOf(c.created_at, locale)}
            {t(" Uhr", "")}
            {c.note ? ` · ${c.note}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpen(c.id)}
          disabled={openingId === c.id}
          className="shrink-0 px-3.5 py-2 rounded-full bg-[#2e2c27] hover:bg-[#1f1d19] disabled:opacity-60 text-[#faf6ef] text-xs font-semibold transition inline-flex items-center gap-1.5"
        >
          {openingId === c.id ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5" />
          )}
          <span>{t("Öffnen", "Open")}</span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(c.id)}
          aria-label={t("Coaching löschen", "Delete coaching")}
          className="shrink-0 p-2 rounded-full text-[#6f6759] hover:text-[#c33418] hover:bg-[#fbeae6] transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <section className="rounded-3xl bg-[#ffffff] border border-[#2e2c27]/[0.08] p-6 sm:p-9 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
        <div>
          <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-[-0.02em] text-[#2e2c27]">
            {t("Meine Coachings", "My coachings")}
          </h3>
          <p className="mt-1.5 text-sm text-[#6f6759]">
            {coachings.length === 0
              ? t("Noch nichts gespeichert.", "Nothing saved yet.")
              : t(
                  `${coachings.length} gespeicherte Analyse${coachings.length === 1 ? "" : "n"}.`,
                  `${coachings.length} saved analys${coachings.length === 1 ? "is" : "es"}.`
                )}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#eee8dd] p-1 rounded-full border border-[#2e2c27]/[0.08]">
          {([
            { id: "calendar", label: t("Kalender", "Calendar"), Icon: CalendarDays },
            { id: "list", label: t("Liste", "List"), Icon: List },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                view === id
                  ? "bg-[#2e2c27] text-[#faf6ef]"
                  : "text-[#6f6759] hover:text-[#2e2c27]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-[#6f6759] inline-flex items-center gap-2 justify-center w-full">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("Coachings werden geladen…", "Loading coachings…")}
        </p>
      ) : view === "calendar" ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              aria-label={t("Vorheriger Monat", "Previous month")}
              className="p-2 rounded-full text-[#6f6759] hover:text-[#2e2c27] hover:bg-[#eee8dd] transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-base font-bold text-[#2e2c27]">
              {cursor.toLocaleDateString(locale, { month: "long", year: "numeric" })}
            </span>
            <button
              type="button"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              aria-label={t("Nächster Monat", "Next month")}
              className="p-2 rounded-full text-[#6f6759] hover:text-[#2e2c27] hover:bg-[#eee8dd] transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {weekdays.map((d) => (
              <span
                key={d}
                className="text-center text-[11px] uppercase tracking-[0.1em] font-semibold text-[#6f6759] pb-1"
              >
                {d}
              </span>
            ))}

            {cells.map((key, i) => {
              if (!key) return <span key={`x${i}`} />;
              const entries = byDay.get(key) ?? [];
              const isSelected = selectedDay === key;
              const isToday = key === todayKey;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={entries.length === 0}
                  onClick={() => setSelectedDay(isSelected ? null : key)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-sm transition border ${
                    isSelected
                      ? "bg-[#2e2c27] text-[#faf6ef] border-[#2e2c27]"
                      : entries.length > 0
                      ? "bg-[#faf6ef] text-[#2e2c27] border-[#2e2c27]/15 hover:border-[#2e2c27]/40"
                      : "bg-transparent text-[#6f6759]/60 border-transparent cursor-default"
                  } ${isToday && !isSelected ? "ring-1 ring-[#c23a20]" : ""}`}
                >
                  <span className={entries.length > 0 ? "font-semibold" : ""}>
                    {Number(key.slice(-2))}
                  </span>
                  {entries.length > 0 && (
                    <span className="flex items-center gap-0.5">
                      {entries.slice(0, 3).map((c, k) => (
                        <span
                          key={k}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: style(c.urteil).dot }}
                        />
                      ))}
                      {entries.length > 3 && (
                        <span className="text-[9px] font-mono">+{entries.length - 3}</span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-center text-xs text-[#6f6759]">
            {t(
              "Tippe auf einen Tag mit Punkten, um die Coachings dieses Tages zu öffnen.",
              "Tap a day with dots to open that day's coachings."
            )}
          </p>

          {selectedDay && (
            <div ref={dayDetailRef} className="mt-7 pt-6 border-t border-[#2e2c27]/10 scroll-mt-24">
              <h4 className="text-sm font-bold text-[#2e2c27] mb-1">{longDate(selectedDay, locale)}</h4>
              <p className="text-xs text-[#6f6759] mb-2">
                {selected.length} Coaching{selected.length === 1 ? "" : "s"}
              </p>
              <div className="divide-y divide-[#2e2c27]/10">
                {selected.map((c) => (
                  <Row key={c.id} c={c} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : coachings.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#6f6759]">
          {t(
            "Speichere eine Analyse, dann erscheint sie hier.",
            "Save an analysis and it will appear here."
          )}
        </p>
      ) : (
        <div className="space-y-6">
          {[...byDay.entries()].map(([key, entries]) => (
            <div key={key}>
              <h4 className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#6f6759] pb-1 border-b border-[#2e2c27]/10">
                {longDate(key, locale)} · {entries.length}
              </h4>
              <div className="divide-y divide-[#2e2c27]/10">
                {entries.map((c) => (
                  <Row key={c.id} c={c} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
