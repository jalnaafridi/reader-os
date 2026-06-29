import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import { ChapterMap } from "@/components/reader/ChapterMap";
import { GenomeSidebar } from "@/components/reader/GenomeSidebar";
import Link from "next/link";
import { ARCHETYPE_META, GENRE_META } from "@/types/database";

export default async function LearnPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("user_profiles").select("*").eq("id", user.id).single();

  if (!profile?.active_book_id) redirect("/library");

  const { data: book } = await supabase
    .from("books").select("*").eq("id", profile.active_book_id).single();

  const { data: chapters } = await supabase
    .from("chapters").select("*, scenes(id)").eq("book_id", profile.active_book_id).order("order");

  const { data: progress } = await supabase
    .from("scene_progress").select("scene_id").eq("user_id", user.id);

  const completedSceneIds = new Set((progress ?? []).map(p => p.scene_id));

  const chaptersWithStatus = (chapters ?? []).map(ch => {
    const sceneIds = (ch.scenes as {id:number}[]).map(s => s.id);
    const completed = sceneIds.length > 0 && sceneIds.every(id => completedSceneIds.has(id));
    const active = !completed && sceneIds.some(id => !completedSceneIds.has(id));
    return { ...ch, completed, active };
  });

  const archMeta = ARCHETYPE_META[profile.current_archetype ?? "INVESTIGATOR"];
  const genreMeta = book ? GENRE_META[book.genre] : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Book banner */}
      {book && (
        <div className="rounded-2xl p-5 mb-6 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${genreMeta?.color ?? "#1a1714"} 0%, #2d2823 100%)` }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)", transform: "translate(20%, -20%)" }} />
          <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-1">Now Reading</p>
          <h2 className="font-serif text-xl font-semibold mb-1">{book.title}</h2>
          <p className="text-xs opacity-70 mb-3">by {book.author}</p>
          <p className="text-xs italic opacity-80">"{book.designing_question}"</p>
        </div>
      )}

      {/* Identity strip */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-violet-light border border-violet/20 rounded-xl px-3 py-2">
          <span className="text-lg">{archMeta.emoji}</span>
          <div>
            <p className="text-xs text-ink-muted">Archetype</p>
            <p className="text-xs font-semibold text-violet">{archMeta.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-amber-light border border-amber/20 rounded-xl px-3 py-2">
          <span className="text-lg">⚡</span>
          <div>
            <p className="text-xs text-ink-muted">XP</p>
            <p className="text-xs font-semibold text-amber">{profile.xp}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-page border border-page-darker rounded-xl px-3 py-2">
          <span className="text-lg">📚</span>
          <div>
            <p className="text-xs text-ink-muted">Read</p>
            <p className="text-xs font-semibold text-ink">{profile.books_completed} books</p>
          </div>
        </div>
      </div>

      {/* Chapter map */}
      <ChapterMap chapters={chaptersWithStatus} />

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-2 gap-3">
        <Link href="/library" className="bg-white border border-page-darker rounded-xl p-4 text-center hover:border-violet transition">
          <div className="text-2xl mb-1">📚</div>
          <p className="text-xs font-medium text-ink">Browse Library</p>
        </Link>
        <Link href="/community" className="bg-white border border-page-darker rounded-xl p-4 text-center hover:border-violet transition">
          <div className="text-2xl mb-1">🏆</div>
          <p className="text-xs font-medium text-ink">Community</p>
        </Link>
      </div>
    </div>
  );
}
