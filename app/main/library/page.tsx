import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BookCard } from "@/components/reader/BookCard";
import { GENRE_META } from "@/types/database";
import type { Genre } from "@/types/database";

export default async function LibraryPage({ searchParams }: { searchParams: { genre?: string } }) {
  const supabase = await createServerSupabaseClient();
  const genre = (searchParams.genre?.toUpperCase() as Genre) || null;

  let query = supabase.from("books").select("*").eq("is_published", true);
  if (genre) query = query.eq("genre", genre);
  const { data: books } = await query.order("created_at", { ascending: false });

  const genres = Object.entries(GENRE_META) as [Genre, typeof GENRE_META[Genre]][];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-serif text-2xl font-semibold text-ink mb-2">Library</h1>
      <p className="text-sm text-ink-muted mb-6">Each book reveals a different part of who you are.</p>

      {/* Genre filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        <a href="/library" className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border transition ${!genre ? "bg-violet text-white border-violet" : "bg-white text-ink-muted border-page-darker hover:border-violet"}`}>
          All
        </a>
        {genres.map(([g, meta]) => (
          <a key={g} href={`/library?genre=${g.toLowerCase()}`}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border transition ${genre === g ? "bg-violet text-white border-violet" : "bg-white text-ink-muted border-page-darker hover:border-violet"}`}>
            {meta.emoji} {meta.label}
          </a>
        ))}
      </div>

      {/* Books grid */}
      {!books?.length ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-ink-muted text-sm">No books yet.</p>
          <p className="text-xs text-ink-faint mt-1">Run the pipeline from <a href="/admin" className="text-violet underline">Admin</a> to add books.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {books.map(book => <BookCard key={book.id} book={book} />)}
        </div>
      )}
    </div>
  );
}
