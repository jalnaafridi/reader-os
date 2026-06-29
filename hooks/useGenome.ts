"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { computeArchetype } from "@/types/database";
import type { Archetype } from "@/types/database";

export interface Genome {
  curiosity: number;
  logic: number;
  empathy: number;
  risk: number;
  trust: number;
}

export interface GenomeState extends Genome {
  archetype: Archetype;
  rareArchetype: string | null;
  xp: number;
  streakDays: number;
  loading: boolean;
}

const DEFAULT_GENOME: Genome = {
  curiosity: 50,
  logic: 50,
  empathy: 50,
  risk: 50,
  trust: 50,
};

export function useGenome() {
  const [state, setState] = useState<GenomeState>({
    ...DEFAULT_GENOME,
    archetype: "INVESTIGATOR",
    rareArchetype: null,
    xp: 0,
    streakDays: 0,
    loading: true,
  });

  const supabase = createClient();

  // Load genome on mount
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setState(s => ({ ...s, loading: false })); return; }

      const { data } = await supabase
        .from("user_profiles")
        .select("curiosity,logic,empathy,risk,trust,current_archetype,rare_archetype,xp,streak_days")
        .eq("id", user.id)
        .single();

      if (data) {
        setState({
          curiosity: data.curiosity,
          logic: data.logic,
          empathy: data.empathy,
          risk: data.risk,
          trust: data.trust,
          archetype: (data.current_archetype as Archetype) || "INVESTIGATOR",
          rareArchetype: data.rare_archetype,
          xp: data.xp,
          streakDays: data.streak_days,
          loading: false,
        });
      } else {
        setState(s => ({ ...s, loading: false }));
      }
    }
    load();
  }, []);

  // Apply deltas locally (optimistic update before API confirms)
  const applyDeltasLocally = useCallback((deltas: Partial<Genome>) => {
    setState(prev => {
      const clamp = (v: number) => Math.min(100, Math.max(0, v));
      const next: Genome = {
        curiosity: clamp(prev.curiosity + (deltas.curiosity || 0)),
        logic:     clamp(prev.logic     + (deltas.logic     || 0)),
        empathy:   clamp(prev.empathy   + (deltas.empathy   || 0)),
        risk:      clamp(prev.risk      + (deltas.risk      || 0)),
        trust:     clamp(prev.trust     + (deltas.trust     || 0)),
      };
      return {
        ...prev,
        ...next,
        archetype: computeArchetype(next),
        xp: prev.xp + 10,
      };
    });
  }, []);

  // Trait labels for UI display
  const traitMeta: Record<keyof Genome, { label: string; color: string }> = {
    curiosity: { label: "Curiosity", color: "#6d4fc2" },
    logic:     { label: "Logic",     color: "#185fa5" },
    empathy:   { label: "Empathy",   color: "#1a9070" },
    risk:      { label: "Risk",      color: "#c44828" },
    trust:     { label: "Trust",     color: "#c07818" },
  };

  // Dominant trait (highest value)
  const dominantTrait = (Object.entries({
    curiosity: state.curiosity,
    logic: state.logic,
    empathy: state.empathy,
    risk: state.risk,
    trust: state.trust,
  }) as [keyof Genome, number][]).sort((a, b) => b[1] - a[1])[0][0];

  return {
    ...state,
    traitMeta,
    dominantTrait,
    applyDeltasLocally,
  };
}
