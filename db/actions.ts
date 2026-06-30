"use server";
// ═══════════════════════════════════════════════════════════
//  READER OS — SERVER ACTIONS
//  Called directly from client components using useTransition.
//  All mutations go through here — no direct Supabase calls
//  from client components.
// ═══════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase/server";
import { recordSceneProgress, updateGenome } from "./queries";
import { computeArchetype } from "@/types/database";

// ── SELECT ACTIVE BOOK ─────────────────────────────────────
export async function selectBook(bookId: number) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase.from("user_profiles")
    .update({ active_book_id: bookId })
    .eq("id", user.id);

  await supabase.from("book_progress").upsert(
    { user_id: user.id, book_id: bookId, current_chapter_order: 1 },
    { onConflict: "user_id,book_id" }
  );

  revalidatePath("/learn");
  revalidatePath("/library");
}

// ── COMPLETE ONBOARDING ────────────────────────────────────
export async function completeOnboarding(
  genome: { curiosity: number; logic: number; empathy: number; risk: number; trust: number },
  answers: Record<string, string>
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const archetype = computeArchetype(genome);

  await supabase.from("user_profiles").update({
    ...genome,
    current_archetype: archetype,
    onboarding_complete: true,
    onboarding_answers: answers,
  }).eq("id", user.id);

  revalidatePath("/learn");
}

// ── UPDATE STREAK (called after reading session) ───────────
export async function updateStreak() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("streak_days, last_read_at")
    .eq("id", user.id)
    .single();

  if (!profile) return;

  const now = new Date();
  const lastRead = profile.last_read_at ? new Date(profile.last_read_at) : null;
  const hoursSince = lastRead ? (now.getTime() - lastRead.getTime()) / 3600000 : 999;
  const newStreak = !lastRead ? 1 : hoursSince < 24 ? profile.streak_days : hoursSince < 48 ? profile.streak_days + 1 : 1;

  await supabase.from("user_profiles").update({
    streak_days: newStreak,
    last_read_at: now.toISOString(),
  }).eq("id", user.id);

  revalidatePath("/learn");
  revalidatePath("/profile");
  return newStreak;
}

// ── MARK BOOK COMPLETE ─────────────────────────────────────
export async function markBookComplete(bookId: number) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("book_progress").upsert({
    user_id: user.id,
    book_id: bookId,
    completed: true,
    completed_at: new Date().toISOString(),
  }, { onConflict: "user_id,book_id" });

  await supabase.from("user_profiles").update({
    books_completed: supabase.rpc("increment" as any),
  }).eq("id", user.id);

  revalidatePath("/learn");
  revalidatePath("/profile");
}

// ── UPDATE USERNAME ────────────────────────────────────────
export async function updateUsername(name: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("user_profiles")
    .update({ user_name: name })
    .eq("id", user.id);

  revalidatePath("/profile");
}

// ── PUBLISH BOOK (admin) ──────────────────────────────────
export async function publishBook(bookId: number) {
  const supabase = await createServiceClient();
  await supabase.from("books")
    .update({ is_published: true })
    .eq("id", bookId);
  revalidatePath("/library");
  revalidatePath("/admin");
}

// ── UNPUBLISH BOOK (admin) ────────────────────────────────
export async function unpublishBook(bookId: number) {
  const supabase = await createServiceClient();
  await supabase.from("books")
    .update({ is_published: false })
    .eq("id", bookId);
  revalidatePath("/library");
  revalidatePath("/admin");
}
