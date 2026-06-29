// ═══════════════════════════════════════════════════════════
//  READER OS — DATABASE QUERY HELPERS
//  All Supabase queries in one place.
//  Used in server components and API routes.
//  Import createServerSupabaseClient from @/lib/supabase
// ═══════════════════════════════════════════════════════════

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Archetype } from "@/types/database";
import { computeArchetype } from "@/types/database";

type DB = SupabaseClient<Database>;

// ── USER PROFILE ───────────────────────────────────────────

export async function getUserProfile(db: DB, userId: string) {
  const { data } = await db
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

export async function updateGenome(
  db: DB,
  userId: string,
  deltas: { curiosity?: number; logic?: number; empathy?: number; risk?: number; trust?: number },
  current: { curiosity: number; logic: number; empathy: number; risk: number; trust: number; xp: number; total_choices_made: number; streak_days: number; last_read_at: string | null }
) {
  const clamp = (v: number) => Math.min(100, Math.max(0, v));

  const newGenome = {
    curiosity: clamp(current.curiosity + (deltas.curiosity || 0)),
    logic:     clamp(current.logic     + (deltas.logic     || 0)),
    empathy:   clamp(current.empathy   + (deltas.empathy   || 0)),
    risk:      clamp(current.risk      + (deltas.risk      || 0)),
    trust:     clamp(current.trust     + (deltas.trust     || 0)),
  };

  const newArchetype = computeArchetype(newGenome);

  // Streak calculation
  const now = new Date();
  const lastRead = current.last_read_at ? new Date(current.last_read_at) : null;
  const hoursSince = lastRead ? (now.getTime() - lastRead.getTime()) / 3600000 : 999;
  const newStreak = !lastRead ? 1 : hoursSince < 24 ? current.streak_days : hoursSince < 48 ? current.streak_days + 1 : 1;

  // Check for rare archetype
  const rareArchetype = detectRareArchetype(newGenome, current.total_choices_made + 1);

  await db.from("user_profiles").update({
    ...newGenome,
    current_archetype: newArchetype,
    rare_archetype: rareArchetype,
    xp: current.xp + 10,
    total_choices_made: current.total_choices_made + 1,
    streak_days: newStreak,
    last_read_at: now.toISOString(),
  }).eq("id", userId);

  return { newGenome, newArchetype, newStreak, rareArchetype };
}

function detectRareArchetype(
  g: { curiosity: number; logic: number; empathy: number; risk: number; trust: number },
  choicesMade: number
): string | null {
  if (choicesMade < 30) return null;
  if (g.curiosity >= 70 && g.empathy >= 65 && g.trust < 40) return "Shadow Investigator";
  if (g.logic >= 70 && g.risk >= 65 && g.empathy < 40)      return "The Tactician";
  if (g.empathy >= 70 && g.risk >= 60 && g.logic < 45)      return "Heartfelt Explorer";
  if (g.trust >= 70 && g.curiosity >= 65 && g.risk < 40)    return "The Faithful Seeker";
  if (g.logic >= 75 && g.trust >= 65 && g.risk < 35)        return "The Architect";
  return null;
}

// ── BOOKS ─────────────────────────────────────────────────

export async function getPublishedBooks(db: DB, genre?: string) {
  let query = db
    .from("books")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (genre) query = query.eq("genre", genre);
  const { data } = await query;
  return data || [];
}

export async function getBookById(db: DB, bookId: number) {
  const { data } = await db
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();
  return data;
}

// ── CHAPTERS ──────────────────────────────────────────────

export async function getChaptersWithProgress(db: DB, bookId: number, userId: string) {
  const { data: chapters } = await db
    .from("chapters")
    .select("*, scenes(id)")
    .eq("book_id", bookId)
    .order("order");

  const { data: progress } = await db
    .from("scene_progress")
    .select("scene_id")
    .eq("user_id", userId);

  const completedIds = new Set((progress || []).map(p => p.scene_id));

  return (chapters || []).map(ch => {
    const sceneIds = ((ch.scenes || []) as { id: number }[]).map(s => s.id);
    const completed = sceneIds.length > 0 && sceneIds.every(id => completedIds.has(id));
    const active = !completed && sceneIds.some(id => !completedIds.has(id));
    return { ...ch, completed, active, sceneIds };
  });
}

export async function getActiveChapter(db: DB, bookId: number, userId: string) {
  const chapters = await getChaptersWithProgress(db, bookId, userId);
  return chapters.find(ch => ch.active) || null;
}

// ── SCENES ────────────────────────────────────────────────

export async function getScenesForChapter(db: DB, chapterId: number, userId: string) {
  const { data: scenes } = await db
    .from("scenes")
    .select("*, choices(*)")
    .eq("chapter_id", chapterId)
    .order("order");

  const { data: progress } = await db
    .from("scene_progress")
    .select("scene_id, choice_id")
    .eq("user_id", userId);

  const completedIds = new Set((progress || []).map(p => p.scene_id));

  return (scenes || []).map(s => ({
    ...s,
    completed: completedIds.has(s.id),
  }));
}

// ── SCENE PROGRESS ─────────────────────────────────────────

export async function recordSceneProgress(
  db: DB,
  userId: string,
  sceneId: number,
  choiceId: number
) {
  // Check already completed
  const { data: existing } = await db
    .from("scene_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("scene_id", sceneId)
    .single();

  if (existing) return { alreadyCompleted: true };

  await db.from("scene_progress").insert({
    user_id: userId,
    scene_id: sceneId,
    choice_id: choiceId,
    completed: true,
  });

  return { alreadyCompleted: false };
}

export async function getCompletedSceneCount(db: DB, userId: string, bookId: number) {
  const { data: chapters } = await db
    .from("chapters")
    .select("scenes(id)")
    .eq("book_id", bookId);

  const allSceneIds = (chapters || [])
    .flatMap(ch => ((ch.scenes || []) as { id: number }[]).map(s => s.id));

  const { data: progress } = await db
    .from("scene_progress")
    .select("scene_id")
    .eq("user_id", userId)
    .in("scene_id", allSceneIds);

  return (progress || []).length;
}

// ── BOOK ANALYTICS (for author dashboard) ─────────────────

export async function getBookAnalytics(db: DB, bookId: number) {
  const { data: chapters } = await db
    .from("chapters")
    .select("id, title, order, scenes(id, title, order)")
    .eq("book_id", bookId)
    .order("order");

  const sceneIds = (chapters || [])
    .flatMap(ch => ((ch.scenes || []) as { id: number }[]).map(s => s.id));

  const { data: analytics } = await db
    .from("book_analytics")
    .select("*, choices(text, archetype_signal)")
    .in("scene_id", sceneIds);

  return { chapters: chapters || [], analytics: analytics || [] };
}

// ── LEADERBOARD ───────────────────────────────────────────

export async function getLeaderboard(db: DB, limit = 10) {
  const { data } = await db
    .from("user_profiles")
    .select("user_name, xp, streak_days, current_archetype, books_completed")
    .order("xp", { ascending: false })
    .limit(limit);
  return data || [];
}

// ── PIPELINE JOBS ─────────────────────────────────────────

export async function createPipelineJob(db: DB, bookTitle: string, genre: string) {
  const id = crypto.randomUUID();
  await db.from("pipeline_jobs").insert({
    id,
    book_title: bookTitle,
    genre: genre as any,
    status: "QUEUED",
    progress: 0,
  });
  return id;
}

export async function updatePipelineJob(
  db: DB,
  jobId: string,
  update: { status?: string; progress?: number; book_id?: number; error?: string; tokens_used?: number }
) {
  await db.from("pipeline_jobs").update({
    ...update,
    ...(update.status === "COMPLETE" ? { completed_at: new Date().toISOString() } : {}),
  }).eq("id", jobId);
}

export async function getPipelineJobs(db: DB, limit = 20) {
  const { data } = await db
    .from("pipeline_jobs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  return data || [];
}
