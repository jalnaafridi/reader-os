"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    router.push("/learn");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-semibold text-violet">
            Reader<span className="text-ink">OS</span>
          </h1>
          <p className="text-ink-muted text-sm mt-2">Know yourself through stories</p>
        </div>

        <div className="bg-white rounded-2xl border border-page-darker p-8 shadow-sm">
          <h2 className="font-serif text-xl font-semibold text-ink mb-6">Welcome back</h2>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-page-darker rounded-xl px-4 py-3 text-sm bg-page focus:outline-none focus:ring-2 focus:ring-violet/30 focus:border-violet transition"
                placeholder="you@example.com" required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-page-darker rounded-xl px-4 py-3 text-sm bg-page focus:outline-none focus:ring-2 focus:ring-violet/30 focus:border-violet transition"
                placeholder="••••••••" required
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-violet text-white font-semibold py-3.5 rounded-full text-sm shadow-[0_3px_0_#3a2878] active:shadow-none active:translate-y-[2px] transition disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Continue reading →"}
            </button>
          </form>
          <p className="text-center text-xs text-ink-muted mt-6">
            New reader?{" "}
            <Link href="/sign-up" className="text-violet font-medium hover:underline">
              Start your journey
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
