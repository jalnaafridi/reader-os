"use client";
import { useEffect, useState } from "react";
import { ARCHETYPE_META } from "@/types/database";
import type { Archetype } from "@/types/database";

interface Genome {
  curiosity: number;
  logic: number;
  empathy: number;
  risk: number;
  trust: number;
}

interface Props {
  archetype: Archetype;
  genome: Genome;
  onCommit: () => void;
  loading?: boolean;
}

const TRAITS: { key: keyof Genome; label: string; color: string }[] = [
  { key: "curiosity", label: "Curiosity", color: "#6d4fc2" },
  { key: "logic",     label: "Logic",     color: "#185fa5" },
  { key: "empathy",   label: "Empathy",   color: "#1a9070" },
  { key: "risk",      label: "Risk",      color: "#c44828" },
  { key: "trust",     label: "Trust",     color: "#c07818" },
];

export function ArchetypeReveal({ archetype, genome, onCommit, loading }: Props) {
  const [barsVisible, setBarsVisible] = useState(false);
  const meta = ARCHETYPE_META[archetype];

  useEffect(() => {
    // Animate bars in after mount
    const t = setTimeout(() => setBarsVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center text-center px-6 py-8 animate-fade-in">
      {/* Orb */}
      <div
        className="w-28 h-28 rounded-full bg-violet-light border-4 border-violet flex items-center justify-center text-5xl mb-6 animate-bounce-in"
        style={{ boxShadow: "0 0 0 12px rgba(109,79,194,0.1)" }}
      >
        {meta.emoji}
      </div>

      <p className="text-xs font-semibold uppercase tracking-widest text-violet mb-2">
        Your Reader Archetype
      </p>
      <h2 className="font-serif text-3xl font-semibold text-ink mb-3">{meta.label}</h2>
      <p className="text-sm text-ink-muted leading-relaxed max-w-xs mb-8">{meta.summary}</p>

      {/* Genome bars */}
      <div className="w-full max-w-xs bg-white border border-page-darker rounded-2xl p-5 mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-4">
          Your Reader Genome
        </p>
        {TRAITS.map(t => (
          <div key={t.key} className="flex items-center gap-3 mb-3 last:mb-0">
            <span className="text-xs font-medium text-ink-muted w-14">{t.label}</span>
            <div className="flex-1 h-1.5 bg-page-darker rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: barsVisible ? `${genome[t.key]}%` : "0%",
                  background: t.color,
                }}
              />
            </div>
            <span className="text-xs font-semibold text-ink w-6 text-right">
              {genome[t.key]}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onCommit}
        disabled={loading}
        className="w-full max-w-xs bg-violet text-white font-semibold py-4 rounded-full shadow-[0_3px_0_#3a2878] active:shadow-none active:translate-y-0.5 disabled:opacity-50 transition"
      >
        {loading ? "Setting up your profile…" : "Commit to my reading journey →"}
      </button>
      <p className="text-xs text-ink-muted mt-3">
        Your genome grows with every choice you make
      </p>
    </div>
  );
}
