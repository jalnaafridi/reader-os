import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import { ReadingSession } from "@/components/reader/ReadingSession";

export default async function LessonPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("user_profiles").select("*").eq("id", user.id).single();
  if (!profile?.active_book_id) redirect("/library");

  // Find the first incomplete chapter
  const { data: chapters } = await supabase
    .from("chapters")
    .select("*, scenes(*, choices(*))")
    .eq("book_id", profile.active_book_id)
    .order("order");

  const { data: progress } = await supabase
    .from("scene_progress").select("scene_id, choice_id").eq("user_id", user.id);

  const completedIds = new Set((progress ?? []).map(p => p.scene_id));

  // Find first chapter with incomplete scenes
  let activeChapter = null;
  for (const ch of chapters ?? []) {
    const scenes = ch.scenes as any[];
    const hasIncomplete = scenes.some((s: any) => !completedIds.has(s.id));
    if (hasIncomplete) { activeChapter = ch; break; }
  }

  if (!activeChapter) redirect("/learn");

  const { data: book } = await supabase
    .from("books").select("title, designing_question, genre").eq("id", profile.active_book_id).single();

  // Normalize scenes with completion status
  const scenes = (activeChapter.scenes as any[]).map((s: any) => ({
    ...s,
    completed: completedIds.has(s.id),
  }));

  const total = (chapters ?? []).length;
  const completedChapters = (chapters ?? []).filter(ch =>
    (ch.scenes as any[]).every((s: any) => completedIds.has(s.id))
  ).length;

  return (
    <ReadingSession
      chapter={{ ...activeChapter, scenes }}
      profile={profile}
      bookTitle={book?.title ?? ""}
      designingQuestion={book?.designing_question ?? ""}
      chapterNum={activeChapter.order}
      totalChapters={total}
      completedChapters={completedChapters}
    />
  );
}
