"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ARCHETYPE_META } from "@/types/database";
import type { Archetype } from "@/types/database";
import { X } from "lucide-react";

interface Choice { id: number; text: string; trait_label: string; archetype_signal: Archetype; identity_insight: string; consequence: string; trait_deltas: Record<string,number>; }
interface Scene { id: number; order: number; title: string; content: string; choice_context: string; choice_question: string; completed: boolean; choices: Choice[]; }
interface Chapter { id: number; order: number; title: string; truby_step: string; scenes: Scene[]; }

interface Props {
  chapter: Chapter;
  profile: any;
  bookTitle: string;
  designingQuestion: string;
  chapterNum: number;
  totalChapters: number;
  completedChapters: number;
}

type Phase = "reading" | "choosing" | "identity" | "consequence" | "done";

export function ReadingSession({ chapter, profile, bookTitle, designingQuestion, chapterNum, totalChapters }: Props) {
  const router = useRouter();
  const sceneList = chapter.scenes;
  const [sceneIdx, setSceneIdx] = useState(() => sceneList.findIndex(s => !s.completed) || 0);
  const [phase, setPhase] = useState<Phase>("reading");
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [identityResult, setIdentityResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [genome, setGenome] = useState({ curiosity: profile.curiosity, logic: profile.logic, empathy: profile.empathy, risk: profile.risk, trust: profile.trust });
  const choiceOpenedAt = useRef<number>(0);

  const scene = sceneList[sceneIdx];
  const progress = Math.round((sceneIdx / sceneList.length) * 100);

  function turnPage() {
    setFlipping(true);
    setTimeout(() => {
      setFlipping(false);
      setPhase("choosing");
      choiceOpenedAt.current = Date.now();
    }, 450);
  }

  async function submitChoice() {
    if (!selectedChoice || submitting) return;
    setSubmitting(true);
    try {
      const dwellMs = Date.now() - choiceOpenedAt.current;
      const res = await fetch("/api/choices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneId: scene.id, choiceId: selectedChoice.id, dwellMs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIdentityResult(data);
      setGenome(data.newGenome);
      setPhase("identity");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function continueAfterIdentity() {
    setPhase("consequence");
  }

  function nextScene() {
    const next = sceneIdx + 1;
    if (next >= sceneList.length) {
      setPhase("done");
    } else {
      setSceneIdx(next);
      setPhase("reading");
      setSelectedChoice(null);
      setIdentityResult(null);
    }
  }

  const archMeta = identityResult ? ARCHETYPE_META[identityResult.newArchetype as Archetype] : null;

  // Chapter complete
  if (phase === "done") {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4 animate-bounce-in">📖</div>
        <h1 className="font-serif text-3xl font-semibold text-ink mb-2">Chapter complete!</h1>
        <p className="text-ink-muted text-sm mb-2">Chapter {chapterNum} of {totalChapters} · Come back tomorrow</p>
        <div className="flex items-center gap-2 mb-6">
          <span className="bg-amber-light text-amber text-sm font-semibold px-3 py-1.5 rounded-full">⚡ +{sceneList.length * 10} XP</span>
          <span className="bg-streak/10 text-streak text-sm font-semibold px-3 py-1.5 rounded-full">🔥 Streak continues</span>
        </div>

        {/* How others chose */}
        <div className="w-full max-w-sm bg-white border border-page-darker rounded-2xl p-5 mb-6 text-left">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-3">How others chose</p>
          {[{ label: "Confronted directly", pct: 41, color: "#c44828" }, { label: "Observed quietly", pct: 33, color: "#6d4fc2" }, { label: "Read the person", pct: 26, color: "#1a9070" }].map(o => (
            <div key={o.label} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-ink">{o.label}</span>
                <span className="font-semibold text-ink">{o.pct}%</span>
              </div>
              <div className="h-1.5 bg-page-darker rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${o.pct}%`, background: o.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button onClick={() => router.push("/learn")} className="bg-violet text-white font-semibold py-3.5 rounded-full shadow-[0_3px_0_#3a2878] active:shadow-none active:translate-y-0.5 transition">
            Back to reading map
          </button>
          <button onClick={() => router.push("/profile")} className="border-2 border-violet-light text-violet font-semibold py-3 rounded-full hover:bg-violet-light transition">
            View my reader genome
          </button>
        </div>
      </div>
    );
  }

  const paragraphs = scene?.content?.split("\n\n").filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-page flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-page-darker sticky top-0 z-30 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push("/learn")} className="w-8 h-8 rounded-full bg-page flex items-center justify-center text-ink-muted hover:bg-page-dark transition">
          <X size={16} />
        </button>
        <div className="flex-1">
          <p className="text-xs text-ink-muted mb-1">Ch.{chapterNum} · {chapter.title} · Scene {sceneIdx + 1}/{sceneList.length}</p>
          <div className="h-2 bg-page-darker rounded-full overflow-hidden">
            <div className="h-full bg-violet rounded-full transition-all duration-500" style={{ width: `${Math.max(5, progress)}%` }} />
          </div>
        </div>
        <span className="text-xs font-semibold text-streak">🔥{profile.streak_days}</span>
      </div>

      {/* Reading area */}
      <div className="flex-1 overflow-y-auto">
        <div className={`max-w-xl mx-auto px-6 py-8 pb-28 ${flipping ? "page-flip" : ""}`} style={{ position: "relative" }}>
          {/* Page edge decoration */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-page-darker to-transparent" />

          <p className="text-xs font-semibold uppercase tracking-widest text-violet mb-2">{scene?.title}</p>
          <h2 className="font-serif text-xl font-semibold text-ink mb-6 leading-tight">{chapter.title}</h2>

          <div className="font-serif text-[17px] leading-[1.9] text-ink-muted space-y-4">
            {paragraphs.map((p, i) => {
              if (p.startsWith("*") && p.endsWith("*")) {
                return <p key={i} className="text-center italic text-xl my-8 text-ink tracking-wide">{p.replace(/\*/g, "")}</p>;
              }
              // Highlight identity words (tagged as [IDENTITY:trait]word[/IDENTITY])
              const rendered = p.replace(/\[IDENTITY:[^\]]+\]([^\[]+)\[\/IDENTITY\]/g, '<span class="border-b-2 border-dotted border-violet/60 text-ink cursor-help" title="Identity marker">$1</span>');
              return <p key={i} dangerouslySetInnerHTML={{ __html: rendered }} />;
            })}
          </div>

          {phase === "reading" && (
            <button onClick={turnPage} className="w-full mt-8 bg-violet text-white font-semibold py-4 rounded-full shadow-[0_3px_0_#3a2878] active:shadow-none active:translate-y-0.5 transition">
              Make your choice →
            </button>
          )}
        </div>
      </div>

      {/* Choice panel */}
      <AnimatePresence>
        {phase === "choosing" && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 bg-ink/50 z-40 flex flex-col justify-end">
            <div className="bg-page rounded-t-3xl p-6 max-w-xl mx-auto w-full max-h-[80vh] overflow-y-auto">
              <div className="w-10 h-1 bg-page-darker rounded-full mx-auto mb-4" />
              <p className="text-xs text-ink-muted italic mb-1">{scene?.choice_context}</p>
              <h3 className="font-serif text-lg font-semibold text-ink mb-5 leading-tight">{scene?.choice_question}</h3>

              <div className="space-y-3 mb-5">
                {scene?.choices?.map(c => (
                  <button key={c.id} onClick={() => setSelectedChoice(c)}
                    className={`w-full text-left p-4 border-2 rounded-xl transition-all ${selectedChoice?.id === c.id ? "border-violet bg-violet-light" : "border-page-darker bg-white hover:border-violet/50"}`}>
                    <span className="block text-sm font-medium text-ink mb-1">{c.text}</span>
                    <span className="block text-xs text-ink-muted">{c.trait_label}</span>
                  </button>
                ))}
              </div>

              <button onClick={submitChoice} disabled={!selectedChoice || submitting}
                className="w-full bg-violet text-white font-semibold py-4 rounded-full shadow-[0_3px_0_#3a2878] active:shadow-none disabled:opacity-40 transition">
                {submitting ? "Recording…" : "Confirm my choice"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Identity reveal overlay */}
      <AnimatePresence>
        {phase === "identity" && identityResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-page z-50 flex flex-col items-center justify-center px-6 text-center">
            <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", delay: 0.1 }}
              className="text-6xl mb-5">{archMeta?.emoji ?? "📖"}</motion.div>
            <h2 className="font-serif text-2xl font-semibold text-ink mb-2">
              {identityResult.identityInsight?.split(".")[0] || "Identity updated"}
            </h2>
            <p className="text-ink-muted text-sm leading-relaxed max-w-xs mb-6">{identityResult.identityInsight}</p>

            {/* Trait deltas */}
            <div className="w-full max-w-xs bg-white border border-page-darker rounded-2xl p-5 mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-4">Reader Genome updated</p>
              {Object.entries(identityResult.traitDeltas || {}).filter(([, v]) => (v as number) !== 0).map(([t, v]) => (
                <div key={t} className="flex items-center justify-between mb-2">
                  <span className="text-sm text-ink-muted capitalize">{t}</span>
                  <span className={`text-sm font-bold ${(v as number) > 0 ? "text-teal" : "text-coral"}`}>
                    {(v as number) > 0 ? `+${v}` : `${v}`}
                  </span>
                </div>
              ))}
              <div className="border-t border-page-dark pt-3 mt-3">
                <p className="text-xs text-ink-muted">Archetype: <span className="font-semibold text-violet">{archMeta?.emoji} {archMeta?.label}</span></p>
              </div>
            </div>

            <button onClick={continueAfterIdentity} className="bg-violet text-white font-semibold px-8 py-4 rounded-full shadow-[0_3px_0_#3a2878] active:shadow-none active:translate-y-0.5 transition">
              Continue the story →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consequence scene */}
      <AnimatePresence>
        {phase === "consequence" && identityResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-page z-40 overflow-y-auto">
            <div className="max-w-xl mx-auto px-6 py-8 pb-28">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-page-darker to-transparent" />
              <p className="text-xs font-semibold uppercase tracking-widest text-violet mb-2">{scene?.title} — continued</p>
              <div className="font-serif text-[17px] leading-[1.9] text-ink-muted">
                {identityResult.consequence?.split("\n\n").map((p: string, i: number) => <p key={i} className="mb-4">{p}</p>)}
              </div>
              <button onClick={nextScene} className="w-full mt-8 bg-teal text-white font-semibold py-4 rounded-full shadow-[0_3px_0_#0f6e56] active:shadow-none active:translate-y-0.5 transition">
                {sceneIdx + 1 >= sceneList.length ? "Complete chapter ✓" : "Next scene →"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
