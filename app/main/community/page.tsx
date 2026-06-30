import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ARCHETYPE_META } from "@/types/database";

export default async function CommunityPage() {
  const supabase = await createServerSupabaseClient();
  const { data: top } = await supabase.from("user_profiles")
    .select("user_name, xp, streak_days, current_archetype")
    .order("xp", { ascending: false }).limit(10);

  const archetypeBattle = [
    { arch: "INVESTIGATOR", count: 1842 }, { arch: "STRATEGIST", count: 1124 },
    { arch: "EXPLORER", count: 934 }, { arch: "DIPLOMAT", count: 756 },
  ];
  const total = archetypeBattle.reduce((s, a) => s + a.count, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Weekly challenge */}
      <div className="rounded-2xl p-5 mb-6 text-white" style={{ background: "linear-gradient(135deg, #6d4fc2 0%, #8b6dd6 100%)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1">🏆 Weekly Challenge · 4 days left</p>
        <h2 className="font-serif text-xl font-semibold mb-1">"Who do you trust?"</h2>
        <p className="text-xs opacity-75">3,847 readers competing · 🔍 Investigators leading</p>
      </div>

      {/* Archetype battle */}
      <div className="bg-white border border-page-darker rounded-2xl p-5 mb-6">
        <h2 className="font-medium text-ink mb-4">Archetype Battle</h2>
        {archetypeBattle.map(a => {
          const m = ARCHETYPE_META[a.arch as keyof typeof ARCHETYPE_META];
          const pct = Math.round((a.count / total) * 100);
          return (
            <div key={a.arch} className="mb-4">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-ink">{m.emoji} {m.label}</span>
                <span className="font-semibold" style={{ color: m.color }}>{a.count.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-page-darker rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: m.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Leaderboard */}
      <div className="bg-white border border-page-darker rounded-2xl p-5">
        <h2 className="font-medium text-ink mb-4">Top Readers This Week</h2>
        {(top ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-4">No readers yet. Be the first!</p>
        ) : (
          <div className="space-y-3">
            {(top ?? []).map((u, i) => {
              const m = ARCHETYPE_META[u.current_archetype ?? "INVESTIGATOR"];
              const rankColors = ["text-amber", "text-ink-muted", "text-amber/70"];
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-page-dark last:border-none">
                  <span className={`text-sm font-bold w-6 ${rankColors[i] || "text-ink-muted"}`}>{i + 1}</span>
                  <div className="w-9 h-9 rounded-full bg-violet-light flex items-center justify-center text-sm font-semibold text-violet">
                    {u.user_name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{u.user_name}</p>
                    <p className="text-xs text-ink-muted">{m.emoji} {m.label} · 🔥{u.streak_days}</p>
                  </div>
                  <span className="text-sm font-bold text-violet">{u.xp} XP</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
