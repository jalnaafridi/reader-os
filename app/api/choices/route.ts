import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { computeArchetype } from "@/types/database";

export async function POST(req: Request) {
  try {
    const { sceneId, choiceId } = await req.json();
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check if already completed
    const { data: existing } = await supabase.from("scene_progress")
      .select("id").eq("user_id", user.id).eq("scene_id", sceneId).single();
    if (existing) return NextResponse.json({ alreadyCompleted: true });

    // Get choice and its trait deltas
    const { data: choice } = await supabase.from("choices")
      .select("*").eq("id", choiceId).single();
    if (!choice) return NextResponse.json({ error: "Choice not found" }, { status: 404 });

    // Get current genome
    const { data: profile } = await supabase.from("user_profiles")
      .select("curiosity,logic,empathy,risk,trust,xp,total_choices_made,streak_days,last_read_at")
      .eq("id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const deltas = choice.trait_deltas as Record<string, number> || {};
    const clamp = (v: number) => Math.min(100, Math.max(0, v));

    const newGenome = {
      curiosity: clamp(profile.curiosity + (deltas.curiosity || 0)),
      logic:     clamp(profile.logic     + (deltas.logic     || 0)),
      empathy:   clamp(profile.empathy   + (deltas.empathy   || 0)),
      risk:      clamp(profile.risk      + (deltas.risk      || 0)),
      trust:     clamp(profile.trust     + (deltas.trust     || 0)),
    };
    const newArchetype = computeArchetype(newGenome);

    // Streak logic
    const now = new Date();
    const lastRead = profile.last_read_at ? new Date(profile.last_read_at) : null;
    const hoursSince = lastRead ? (now.getTime() - lastRead.getTime()) / 3600000 : 999;
    const newStreak = !lastRead ? 1 : hoursSince < 24 ? profile.streak_days : hoursSince < 48 ? profile.streak_days + 1 : 1;

    // Record progress
    await supabase.from("scene_progress").insert({ user_id: user.id, scene_id: sceneId, choice_id: choiceId, completed: true });

    // Update genome + streak + XP
    await supabase.from("user_profiles").update({
      ...newGenome, current_archetype: newArchetype,
      xp: profile.xp + 10, total_choices_made: profile.total_choices_made + 1,
      streak_days: newStreak, last_read_at: now.toISOString(),
    }).eq("id", user.id);

    return NextResponse.json({
      newGenome, newArchetype,
      traitDeltas: deltas,
      identityInsight: choice.identity_insight,
      traitLabel: choice.trait_label,
      consequence: choice.consequence,
      newStreak,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
