"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { GENRE_META } from "@/types/database";
import type { Genre } from "@/types/database";

interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  cover_url: string;
  cover_color: string;
  genre: Genre;
  difficulty: string;
  designing_question: string;
  total_chapters: number;
}

export function BookCard({ book }: { book: Book }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const genreMeta = GENRE_META[book.genre];

  async function selectBook() {
    setLoading(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { toast.error("Sign in to read"); setLoading(false); return; }

    await sb.from("user_profiles")
      .update({ active_book_id: book.id })
      .eq("id", user.id);

    await sb.from("book_progress").upsert(
      { user_id: user.id, book_id: book.id, current_chapter_order: 1 },
      { onConflict: "user_id,book_id" }
    );

    toast.success(`Starting "${book.title}"`);
    router.push("/learn");
    router.refresh();
  }

  return (
    <div className="bg-white border border-page-darker rounded-2xl overflow-hidden hover:border-violet/50 transition-all duration-200 group">
      <div className="flex gap-4 p-4">
        {/* Cover */}
        <div
          className="w-[60px] h-[84px] rounded-lg overflow-hidden flex-shrink-0 relative shadow-sm"
          style={{ background: book.cover_color }}
        >
          {book.cover_url && !book.cover_url.includes("placeholder") ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">
              {genreMeta?.emoji || "📖"}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-semibold text-ink text-sm leading-snug mb-0.5 line-clamp-2">
            {book.title}
          </h3>
          <p className="text-xs text-ink-muted mb-2">by {book.author}</p>
          <p className="text-xs text-ink-muted leading-relaxed line-clamp-2 mb-3">
            {book.description?.slice(0, 120)}…
          </p>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs bg-page text-ink-muted px-2 py-0.5 rounded-full border border-page-darker">
              {genreMeta?.emoji} {genreMeta?.label}
            </span>
            <span className="text-xs bg-page text-ink-muted px-2 py-0.5 rounded-full border border-page-darker">
              {book.total_chapters} chapters
            </span>
            <span className="text-xs bg-page text-ink-muted px-2 py-0.5 rounded-full border border-page-darker">
              {book.difficulty}
            </span>
          </div>
        </div>
      </div>

      {/* Designing question */}
      {book.designing_question && (
        <div className="px-4 pb-3 pt-0">
          <p className="text-xs italic text-violet border-t border-page-dark pt-3 leading-relaxed">
            "{book.designing_question}"
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="px-4 pb-4">
        <button
          onClick={selectBook}
          disabled={loading}
          className="w-full bg-violet text-white font-semibold py-2.5 rounded-xl text-sm shadow-[0_2px_0_#3a2878] active:shadow-none active:translate-y-px disabled:opacity-50 transition hover:opacity-90"
        >
          {loading ? "Starting…" : "Start reading →"}
        </button>
      </div>
    </div>
  );
}
