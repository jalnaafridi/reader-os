"use client";
import Link from "next/link";
import { CircularProgressbarWithChildren } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { BookOpen, Check, Lock, Crown } from "lucide-react";

interface ChapterData {
  id: number;
  order: number;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
}

export function ChapterMap({ chapters }: { chapters: ChapterData[] }) {
  if (!chapters.length) return (
    <div className="text-center py-12">
      <p className="text-ink-muted text-sm">No chapters yet.</p>
      <Link href="/library" className="text-violet text-sm font-medium mt-2 block">
        Choose a book →
      </Link>
    </div>
  );

  return (
    <div className="flex flex-col items-center py-4">
      {chapters.map((ch, idx) => {
        const indent = [0, 1, 2, 1, 0, -1, -2, -1][idx % 8] * 32;

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
                    <CircularProgressbarWithChildren
                      value={25}
                      styles={{ path: { stroke: "#6d4fc2" }, trail: { stroke: "#e8e2d8" } }}
                    >
                      <div className="w-[56px] h-[56px] rounded-full bg-violet flex items-center justify-center shadow-[0_3px_0_#3a2878] chapter-pulse cursor-pointer hover:opacity-90 transition">
                        <BookOpen size={22} className="text-white" />
                      </div>
                    </CircularProgressbarWithChildren>
                  </div>
                </Link>
              ) : ch.completed ? (
                <div className="w-[68px] h-[68px] rounded-full bg-violet border-4 border-[#3a2878] flex items-center justify-center shadow-[0_3px_0_#3a2878]">
                  <Check size={24} className="text-white stroke-[3]" />
                </div>
              ) : idx === chapters.length - 1 ? (
                <div className="w-[68px] h-[68px] rounded-full bg-amber border-4 border-[#8a5010] flex items-center justify-center opacity-30">
                  <Crown size={22} className="text-white" />
                </div>
              ) : (
                <div className="w-[68px] h-[68px] rounded-full bg-page-darker border-4 border-ink-faint flex items-center justify-center opacity-40">
                  <Lock size={20} className="text-ink-muted" />
                </div>
              )}

              <p className={`text-xs font-medium text-center mt-2 mb-2 max-w-[90px] ${
                ch.active ? "text-violet font-semibold" :
                ch.completed ? "text-teal" : "text-ink-muted"
              }`}>
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
