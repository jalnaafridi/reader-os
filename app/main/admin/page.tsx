"use client";
import { useState } from "react";
import { toast } from "sonner";
import { GENRE_META } from "@/types/database";
import type { Genre } from "@/types/database";

interface JobStatus {
  id: string;
  book_title: string;
  status: string;
  progress: number;
  error?: string;
}

export default function AdminPage() {
  const [running, setRunning] = useState(false);
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [genre, setGenre] = useState<Genre>("MYSTERY");
  const [mode, setMode] = useState<"fast" | "full">("fast");

  async function runPipeline() {
    setRunning(true);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pipeline failed");
      toast.success(`Pipeline started for ${genre}!`);
      setJobs(prev => [...(data.jobs || []), ...prev]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRunning(false);
    }
  }

  async function publishAll() {
    const res = await fetch("/api/books/publish-all", { method: "POST" });
    if (res.ok) toast.success("All processed books published!");
    else toast.error("Failed to publish");
  }

  const genres = Object.keys(GENRE_META) as Genre[];
  const STATUS_COLORS: Record<string, string> = {
    COMPLETE: "text-teal bg-teal-light", FAILED: "text-coral bg-coral-light",
    QUEUED: "text-amber bg-amber-light", GENERATING: "text-violet bg-violet-light",
    SEEDING: "text-violet bg-violet-light",
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">Admin Pipeline</h1>
        <span className="text-xs bg-amber-light text-amber px-2 py-0.5 rounded-full font-medium">Beta</span>
      </div>
      <p className="text-sm text-ink-muted mb-8">Run the AI pipeline to fetch books from Open Library and generate Reader OS chapters, scenes, and choices. No terminal needed.</p>

      {/* Pipeline control */}
      <div className="bg-white border border-page-darker rounded-2xl p-6 mb-6">
        <h2 className="font-medium text-ink mb-4">Run Pipeline</h2>

        <div className="mb-4">
          <label className="block text-xs font-medium text-ink-muted mb-2">Genre</label>
          <div className="flex flex-wrap gap-2">
            {genres.map(g => (
              <button key={g} onClick={() => setGenre(g)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${genre === g ? "bg-violet text-white border-violet" : "bg-page text-ink-muted border-page-darker hover:border-violet"}`}>
                {GENRE_META[g].emoji} {GENRE_META[g].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-medium text-ink-muted mb-2">Mode</label>
          <div className="flex gap-2">
            {[{ val: "fast", label: "Fast (3 chapters, no council)", cost: "~$0.05" },
              { val: "full", label: "Full (8 chapters + council review)", cost: "~$0.20" }].map(m => (
              <button key={m.val} onClick={() => setMode(m.val as "fast" | "full")}
                className={`flex-1 p-3 rounded-xl text-left border text-xs transition ${mode === m.val ? "border-violet bg-violet-light" : "border-page-darker bg-page hover:border-violet"}`}>
                <p className="font-medium text-ink">{m.label}</p>
                <p className="text-ink-muted mt-0.5">Est. cost: {m.cost}</p>
              </button>
            ))}
          </div>
        </div>

        <button onClick={runPipeline} disabled={running}
          className="w-full bg-violet text-white font-semibold py-3.5 rounded-xl text-sm shadow-[0_3px_0_#3a2878] active:shadow-none disabled:opacity-50 transition flex items-center justify-center gap-2">
          {running ? (<><span className="animate-spin">⚙️</span> Running pipeline…</>) : `🚀 Run Pipeline — ${GENRE_META[genre].label}`}
        </button>
      </div>

      {/* Publish */}
      <div className="bg-teal-light border border-teal/20 rounded-2xl p-5 mb-6">
        <h2 className="font-medium text-ink mb-1">Publish Books</h2>
        <p className="text-xs text-ink-muted mb-4">Books are created with is_published=false. Click below to make them live for all readers.</p>
        <button onClick={publishAll} className="bg-teal text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition hover:opacity-90">
          ✅ Publish all processed books
        </button>
      </div>

      {/* Job log */}
      {jobs.length > 0 && (
        <div className="bg-white border border-page-darker rounded-2xl p-5">
          <h2 className="font-medium text-ink mb-4">Pipeline Jobs</h2>
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-page rounded-xl">
                <div>
                  <p className="text-sm font-medium text-ink">{job.book_title}</p>
                  {job.error && <p className="text-xs text-coral mt-0.5">{job.error}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-page-darker rounded-full overflow-hidden">
                    <div className="h-full bg-violet rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] || "bg-page-darker text-ink-muted"}`}>
                    {job.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
