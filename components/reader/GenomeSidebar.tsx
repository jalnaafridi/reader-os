"use client";
import { ARCHETYPE_META } from "@/types/database";
import type { Archetype } from "@/types/database";

interface Props {
  genome: {
    curiosity: number;
    logic: number;
    empathy: number;
    risk: number;
    trust: number;
  };
  archetype: Archetype;
  xp: number;
  streakDays: number;
  booksCompleted: number;
}

const TRAITS = [
  { key: "curiosity", label: "Curiosity", color: "#6d4fc2" },
  { key: "logic",     label: "Logic",     color: "#185fa5" },
  { key: "empathy",   label: "Empathy",   color: "#1a9070" },
  { key: "risk",      label: "Risk",      color: "#c44828" },
  { key: "trust",     label: "Trust",     color: "#c07818" },
] as const;

export function GenomeSidebar({ genome, archetype, xp, streakDays, booksCompleted }: Props) {
  const meta = ARCHETYPE_META[archetype];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Archetype */}
      <div className="bg-violet-light border border-violet/20 rounded-xl p-4">
        <p className="text-xs text-ink-muted font-medium mb-1">Current Archetype</p>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{meta.emoji}</span>
          <span className="font-semibold text-violet text-sm">{meta.label}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2">
        <div className="flex-1 bg-amber-light border border-amber/20 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber">🔥{streakDays}</p>
          <p className="text-xs text-ink-muted">Streak</p>
        </div>
        <div className="flex-1 bg-page border border-page-darker rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-ink">{xp}</p>
          <p className="text-xs text-ink-muted">XP</p>
        </div>
        <div className="flex-1 bg-page border border-page-darker rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-ink">{booksCompleted}</p>
          <p className="text-xs text-ink-muted">Books</p>
        </div>
      </div>

      {/* Genome */}
      <div className="bg-white border border-page-darker rounded-xl p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-3">Reader Genome</p>
        {TRAITS.map(t => {
          const val = genome[t.key];
          return (
            <div key={t.key} className="flex items-center gap-3 mb-2.5 last:mb-0">
              <span className="text-xs font-medium text-ink-muted w-14">{t.label}</span>
              <div className="flex-1 h-1.5 bg-page-darker rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${val}%`, background: t.color }}
                />
              </div>
              <span className="text-xs font-semibold text-ink w-6 text-right">{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
