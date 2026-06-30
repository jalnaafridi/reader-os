import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ARCHETYPE_META } from "@/types/database";

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: p } = await supabase.from("user_profiles").select("*").eq("id", user.id).single();
  if (!p) redirect("/sign-in");

  const arch = ARCHETYPE_META[p.current_archetype ?? "INVESTIGATOR"];
  const traits = [
    { name: "Curiosity", val: p.curiosity, color: "#6d4fc2" },
    { name: "Logic",     val: p.logic,     color: "#185fa5" },
    { name: "Empathy",   val: p.empathy,   color: "#1a9070" },
    { name: "Risk",      val: p.risk,      color: "#c44828" },
    { name: "Trust",     val: p.trust,     color: "#c07818" },
  ];

  const allArchetypes = Object.entries(ARCHETYPE_META);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-full bg-violet-light border-4 border-violet flex items-center justify-center text-3xl font-semibold text-violet mx-auto mb-3">
          {p.user_name[0].toUpperCase()}
        </div>
        <h1 className="font-serif text-2xl font-semibold text-ink">{p.user_name}</h1>
        <div className="inline-flex items-center gap-2 bg-violet-light text-violet text-sm font-semibold px-4 py-1.5 rounded-full mt-2">
          {arch.emoji} {arch.label}
        </div>
        {p.rare_archetype && (
          <div className="inline-flex items-center gap-1 bg-amber-light text-amber text-xs font-semibold px-3 py-1 rounded-full mt-2 ml-2">
            ✨ {p.rare_archetype}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { val: `🔥${p.streak_days}`, lbl: "Streak" },
          { val: p.books_completed, lbl: "Books" },
          { val: p.xp, lbl: "XP" },
          { val: p.total_choices_made, lbl: "Choices" },
        ].map(s => (
          <div key={s.lbl} className="bg-white border border-page-darker rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-ink">{s.val}</p>
            <p className="text-xs text-ink-muted mt-0.5">{s.lbl}</p>
          </div>
        ))}
      </div>

      {/* Genome */}
      <div className="bg-white border border-page-darker rounded-2xl p-5 mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-4">Reader Genome</h2>
        {traits.map(t => (
          <div key={t.name} className="flex items-center gap-3 mb-3">
            <span className="text-xs font-medium text-ink-muted w-16">{t.name}</span>
            <div className="flex-1 h-2 bg-page-darker rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${t.val}%`, background: t.color }} />
            </div>
            <span className="text-xs font-semibold text-ink w-7 text-right">{t.val}</span>
          </div>
        ))}
        <p className="text-xs text-ink-muted mt-4 leading-relaxed border-t border-page-dark pt-4">{arch.summary}</p>
      </div>

      {/* Archetypes */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-3">Archetypes</h2>
        <div className="grid grid-cols-3 gap-2">
          {allArchetypes.map(([key, m]) => {
            const isActive = key === p.current_archetype;
            return (
              <div key={key} className={`rounded-xl p-3 text-center border transition ${isActive ? "border-violet bg-violet-light" : "border-page-darker bg-white opacity-50"}`}>
                <div className="text-2xl mb-1">{m.emoji}</div>
                <p className={`text-xs font-semibold ${isActive ? "text-violet" : "text-ink"}`}>
                  {m.label.replace("The ", "")}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Share */}
      <button className="w-full bg-violet text-white font-semibold py-3.5 rounded-full text-sm shadow-[0_3px_0_#3a2878] active:shadow-none active:translate-y-0.5 transition">
        📤 Share my reader card
      </button>
    </div>
  );
}
