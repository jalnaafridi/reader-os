"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { CircularProgressbarWithChildren } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { BookOpen, Check, Lock, Crown, Home, Library, User, Trophy, Settings } from "lucide-react";

// ── ChapterMap ─────────────────────────────────────────────
interface ChapterData { id: number; order: number; title: string; description: string; completed: boolean; active: boolean; }
export function ChapterMap({ chapters }: { chapters: ChapterData[] }) {
  if (!chapters.length) return (
    <div className="text-center py-12">
      <p className="text-ink-muted text-sm">No chapters yet.</p>
      <Link href="/library" className="text-violet text-sm font-medium mt-2 block">Choose a book →</Link>
    </div>
  );

  return (
    <div className="flex flex-col items-center py-4">
      {chapters.map((ch, idx) => {
        const isLast = idx === chapters.length - 1;
        const indent = [0,1,2,1,0,-1,-2,-1][idx % 8] * 32;

        return (
          <div key={ch.id} className="flex flex-col items-center" style={{ marginRight: `${-indent}px` }}>
            <div className="relative flex flex-col items-center mb-1">
              {ch.active && (
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-white border-2 border-violet text-violet text-xs font-bold px-3 py-1 rounded-xl uppercase tracking-wide whitespace-nowrap z-10">
                  Today ▼
                </div>
              )}

              {ch.active ? (
                <Link href="/lesson">
                  <div className="w-[72px] h-[72px]">
                    <CircularProgressbarWithChildren value={25}
                      styles={{ path: { stroke: "#6d4fc2" }, trail: { stroke: "#e8e2d8" } }}>
                      <div className="w-[56px] h-[56px] rounded-full bg-violet flex items-center justify-center shadow-[0_3px_0_#3a2878] chapter-pulse cursor-pointer hover:opacity-90 transition">
                        <BookOpen size={22} className="text-white" />
                      </div>
                    </CircularProgressbarWithChildren>
                  </div>
                </Link>
              ) : ch.completed ? (
                <Link href="/lesson">
                  <div className="w-[68px] h-[68px] rounded-full bg-violet border-4 border-[#3a2878] flex items-center justify-center shadow-[0_3px_0_#3a2878] cursor-pointer hover:opacity-90 transition">
                    <Check size={24} className="text-white stroke-[3]" />
                  </div>
                </Link>
              ) : isLast ? (
                <div className="w-[68px] h-[68px] rounded-full bg-amber border-4 border-[#8a5010] flex items-center justify-center shadow-[0_3px_0_#8a5010] opacity-30">
                  <Crown size={22} className="text-white" />
                </div>
              ) : (
                <div className="w-[68px] h-[68px] rounded-full bg-page-darker border-4 border-ink-faint flex items-center justify-center opacity-40">
                  <Lock size={20} className="text-ink-muted" />
                </div>
              )}

              <p className={`text-xs font-medium text-center mt-2 max-w-[90px] ${ch.active ? "text-violet font-semibold" : ch.completed ? "text-teal" : "text-ink-muted"}`}>
                Ch.{ch.order} {ch.title}
              </p>
            </div>

            {idx < chapters.length - 1 && (
              <div className="w-0.5 h-6 bg-page-darker mb-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── BookCard ───────────────────────────────────────────────
export function BookCard({ book }: { book: any }) {
  return (
    <div className="bg-white border border-page-darker rounded-2xl overflow-hidden hover:border-violet transition group">
      <div className="flex gap-4 p-4">
        {/* Cover */}
        <div className="w-[56px] h-[78px] rounded-lg overflow-hidden flex-shrink-0 relative" style={{ background: book.cover_color }}>
          {book.cover_url && book.cover_url !== "/placeholder-cover.jpg" ? (
            <Image src={book.cover_url} alt={book.title} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">📖</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-semibold text-ink text-sm leading-tight mb-0.5 truncate">{book.title}</h3>
          <p className="text-xs text-ink-muted mb-2">by {book.author}</p>
          <p className="text-xs text-ink-muted leading-relaxed line-clamp-2 mb-3">{book.description?.slice(0, 100)}…</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs bg-page text-ink-muted px-2 py-0.5 rounded-full">{book.total_chapters} ch</span>
            <span className="text-xs bg-page text-ink-muted px-2 py-0.5 rounded-full">{book.difficulty}</span>
          </div>
        </div>
      </div>

      {/* Designing question */}
      {book.designing_question && (
        <div className="px-4 pb-3">
          <p className="text-xs italic text-ink-muted border-t border-page-dark pt-3">"{book.designing_question}"</p>
        </div>
      )}

      {/* Select button */}
      <div className="px-4 pb-4">
        <SelectBookButton bookId={book.id} />
      </div>
    </div>
  );
}

// Client component for selecting a book
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

function SelectBookButton({ bookId }: { bookId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function select() {
    setLoading(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { toast.error("Sign in to read"); setLoading(false); return; }
    await sb.from("user_profiles").update({ active_book_id: bookId }).eq("id", user.id);
    await sb.from("book_progress").upsert({ user_id: user.id, book_id: bookId, current_chapter_order: 1 }, { onConflict: "user_id,book_id" });
    toast.success("Book selected!");
    router.push("/learn");
    router.refresh();
  }
  return (
    <button onClick={select} disabled={loading}
      className="w-full bg-violet text-white font-semibold py-2.5 rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition">
      {loading ? "Starting…" : "Start reading →"}
    </button>
  );
}

// ── MobileNav ──────────────────────────────────────────────
export function MobileNav() {
  const path = usePathname();
  const tabs = [
    { href: "/learn",     icon: Home,    label: "Home"     },
    { href: "/library",   icon: Library, label: "Library"  },
    { href: "/lesson",    icon: BookOpen,label: "Read"     },
    { href: "/profile",   icon: User,    label: "Identity" },
    { href: "/community", icon: Trophy,  label: "Compete"  },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-page-darker h-16 flex z-50">
      {tabs.map(t => {
        const active = path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`flex-1 flex flex-col items-center justify-center gap-1 transition ${active ? "text-violet" : "text-ink-muted hover:text-ink"}`}>
            <t.icon size={22} />
            <span className="text-[10px] font-medium">{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
