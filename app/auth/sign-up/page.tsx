"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { computeArchetype, ARCHETYPE_META } from "@/types/database";
import type { Archetype } from "@/types/database";

const QUESTIONS = [
  {
    id: "motivation",
    question: "What brings you here today?",
    sub: "Not your reading habit — your deeper reason.",
    options: [
      { value: "understand_self", label: "📚 I want to understand myself better", sub: "Reading as a mirror, not just entertainment", traits: { curiosity: 10, empathy: 5 } },
      { value: "better_writer",   label: "✍️ I want to become a better writer",   sub: "Understand how readers think and feel",      traits: { curiosity: 8, logic: 7 } },
      { value: "intellectual",   label: "🧠 I want to grow intellectually",        sub: "Stories that challenge how I see the world",  traits: { logic: 10, curiosity: 8 } },
      { value: "connect",        label: "💬 I want to connect with readers",       sub: "Find people who think the way I do",          traits: { empathy: 10, trust: 8 } },
    ],
  },
  {
    id: "decision",
    question: "When you face a difficult decision, you usually…",
    sub: "There are no right answers. This is how we understand you.",
    options: [
      { value: "gather_facts",  label: "🔍 Gather every fact before acting",     sub: "Information is protection",          traits: { logic: 8, curiosity: 5, risk: -3 } },
      { value: "trust_gut",     label: "💡 Trust your gut and move quickly",     sub: "Instinct has never failed you",       traits: { risk: 8, curiosity: 5, logic: -3 } },
      { value: "ask_others",    label: "🤝 Ask people you trust for their view", sub: "Other minds see what yours can't",    traits: { trust: 8, empathy: 7, risk: -2 } },
      { value: "weigh_risks",   label: "⚖️ Weigh the risks carefully, then commit", sub: "Caution is intelligence",          traits: { logic: 7, trust: 5, risk: -2 } },
    ],
  },
  {
    id: "story",
    question: "What kind of story stays with you longest?",
    sub: "The kind you're still thinking about a month later.",
    options: [
      { value: "mystery",    label: "🕵️ A mystery where nothing is as it seems",          sub: "You enjoy being wrong, then right",               traits: { curiosity: 8, logic: 5 } },
      { value: "character",  label: "💔 A character who breaks and rebuilds",             sub: "Transformation is the only story worth telling",  traits: { empathy: 10, curiosity: 5 } },
      { value: "world",      label: "⚔️ A world where the rules are completely different", sub: "Escape is its own kind of truth",                 traits: { risk: 8, curiosity: 7 } },
      { value: "lens",       label: "🌍 A story that makes you see the world differently", sub: "Fiction as a lens for life",                      traits: { curiosity: 8, empathy: 7 } },
    ],
  },
  {
    id: "gap",
    question: "What reading gap are you trying to close?",
    sub: "Be honest. This is between you and Reader OS.",
    options: [
      { value: "finish",   label: "⏰ I start books but never finish them",   sub: "Commitment has been the problem",  traits: { risk: -2, trust: 3 } },
      { value: "retain",   label: "🧩 I read but don't retain what I read",   sub: "The ideas don't stick",            traits: { logic: 5, curiosity: 3 } },
      { value: "discover", label: "🗺️ I don't know what to read next",         sub: "Too many books, no direction",     traits: { curiosity: 5, trust: 3 } },
      { value: "passive",  label: "🔇 Reading feels passive and lonely",       sub: "I want it to feel alive",          traits: { empathy: 5, trust: 4 } },
    ],
  },
  {
    id: "commitment",
    question: "How often are you willing to commit?",
    sub: "One session per day. 10 minutes. How do you approach it?",
    options: [
      { value: "daily",    label: "🔥 Every single day — no exceptions",      sub: "The streak is sacred",                traits: { risk: 3, logic: 2 } },
      { value: "most",     label: "📅 Most days — I'm realistic about life",   sub: "Consistency over perfection",          traits: { trust: 3, empathy: 2 } },
      { value: "mood",     label: "🌊 When I feel it — quality over quantity", sub: "Mood reader",                         traits: { curiosity: 3, risk: 2 } },
    ],
  },
];

function seedGenome(answers: Record<string, string>) {
  const genome = { curiosity: 50, logic: 50, empathy: 50, risk: 50, trust: 50 };
  for (const q of QUESTIONS) {
    const answer = answers[q.id];
    const option = q.options.find(o => o.value === answer);
    if (option?.traits) {
      for (const [trait, val] of Object.entries(option.traits)) {
        const k = trait as keyof typeof genome;
        genome[k] = Math.min(100, Math.max(0, genome[k] + val));
      }
    }
  }
  return genome;
}

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "questions" | "reveal">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [genome, setGenome] = useState<ReturnType<typeof seedGenome> | null>(null);
  const [archetype, setArchetype] = useState<Archetype>("INVESTIGATOR");
  const [loading, setLoading] = useState(false);

  async function handleEmailStep(e: React.FormEvent) {
    e.preventDefault();
    setStep("questions");
  }

  function handleAnswer(qId: string, value: string) {
    const newAnswers = { ...answers, [qId]: value };
    setAnswers(newAnswers);
    setTimeout(() => {
      if (qIndex < QUESTIONS.length - 1) {
        setQIndex(i => i + 1);
      } else {
        const g = seedGenome(newAnswers);
        setGenome(g);
        setArchetype(computeArchetype(g));
        setStep("reveal");
      }
    }, 280);
  }

  async function handleCommit() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (data.user && genome) {
      await supabase.from("user_profiles").upsert({
        id: data.user.id,
        user_name: name,
        ...genome,
        current_archetype: archetype,
        onboarding_complete: true,
        onboarding_answers: answers,
      });
    }
    toast.success("Welcome to Reader OS!");
    router.push("/learn");
    router.refresh();
  }

  const meta = ARCHETYPE_META[archetype];
  const q = QUESTIONS[qIndex];

  if (step === "reveal" && genome) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center animate-fade-in">
          <div className="w-28 h-28 rounded-full bg-violet-light border-4 border-violet flex items-center justify-center text-6xl mx-auto mb-6 animate-bounce-in" style={{ boxShadow: "0 0 0 8px rgba(109,79,194,0.12)" }}>
            {meta.emoji}
          </div>
          <p className="text-xs font-semibold tracking-widest text-violet uppercase mb-2">Your Reader Archetype</p>
          <h2 className="font-serif text-3xl font-semibold text-ink mb-3">{meta.label}</h2>
          <p className="text-ink-muted text-sm leading-relaxed max-w-xs mx-auto mb-8">{meta.summary}</p>

          <div className="bg-white rounded-2xl border border-page-darker p-5 mb-8 text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-4">Your Reader Genome</p>
            {Object.entries(genome).map(([trait, val]) => (
              <div key={trait} className="flex items-center gap-3 mb-2.5">
                <span className="text-xs font-medium text-ink-muted w-16 capitalize">{trait}</span>
                <div className="flex-1 h-1.5 bg-page-darker rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-violet transition-all duration-700" style={{ width: `${val}%` }} />
                </div>
                <span className="text-xs font-semibold text-ink w-6 text-right">{val}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleCommit} disabled={loading}
            className="w-full bg-violet text-white font-semibold py-4 rounded-full text-sm shadow-[0_3px_0_#3a2878] active:shadow-none active:translate-y-0.5 transition disabled:opacity-50"
          >
            {loading ? "Creating your profile…" : "Commit to my reading journey →"}
          </button>
          <p className="text-xs text-ink-muted mt-3">Your genome updates with every choice you make</p>
        </div>
      </div>
    );
  }

  if (step === "questions") {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in" key={qIndex}>
          <div className="text-center mb-8">
            <h1 className="font-serif text-2xl font-semibold text-violet">Reader<span className="text-ink">OS</span></h1>
          </div>
          <div className="flex gap-1.5 mb-8 justify-center">
            {QUESTIONS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i < qIndex ? "bg-violet w-6" : i === qIndex ? "bg-violet w-10" : "bg-page-darker w-6"}`} />
            ))}
          </div>
          <h2 className="font-serif text-xl font-semibold text-ink text-center mb-2">{q.question}</h2>
          <p className="text-xs text-ink-muted text-center mb-8">{q.sub}</p>
          <div className="space-y-3">
            {q.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleAnswer(q.id, opt.value)}
                className={`w-full text-left p-4 border-2 rounded-xl transition-all duration-150 bg-white hover:border-violet hover:bg-violet-light ${answers[q.id] === opt.value ? "border-violet bg-violet-light" : "border-page-darker"}`}
              >
                <span className="block text-sm font-medium text-ink">{opt.label}</span>
                <span className="block text-xs text-ink-muted mt-0.5">{opt.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-semibold text-violet">Reader<span className="text-ink">OS</span></h1>
          <p className="text-ink-muted text-sm mt-2">Discover who you are as a reader</p>
        </div>
        <div className="bg-white rounded-2xl border border-page-darker p-8 shadow-sm">
          <h2 className="font-serif text-xl font-semibold text-ink mb-6">Start your journey</h2>
          <form onSubmit={handleEmailStep} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">Your name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full border border-page-darker rounded-xl px-4 py-3 text-sm bg-page focus:outline-none focus:ring-2 focus:ring-violet/30 focus:border-violet transition"
                placeholder="Alex" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-page-darker rounded-xl px-4 py-3 text-sm bg-page focus:outline-none focus:ring-2 focus:ring-violet/30 focus:border-violet transition"
                placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-page-darker rounded-xl px-4 py-3 text-sm bg-page focus:outline-none focus:ring-2 focus:ring-violet/30 focus:border-violet transition"
                placeholder="••••••••" minLength={6} required />
            </div>
            <button type="submit"
              className="w-full bg-violet text-white font-semibold py-3.5 rounded-full text-sm shadow-[0_3px_0_#3a2878] active:shadow-none active:translate-y-0.5 transition">
              Discover my reading identity →
            </button>
          </form>
          <p className="text-center text-xs text-ink-muted mt-6">
            Already a reader?{" "}
            <a href="/sign-in" className="text-violet font-medium hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
