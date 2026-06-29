import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import { MobileNav } from "@/components/reader/MobileNav";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("user_profiles").select("*").eq("id", user.id).single();

  return (
    <div className="min-h-screen bg-page">
      {/* Top nav */}
      <nav className="bg-white border-b border-page-darker sticky top-0 z-50 h-14 flex items-center justify-between px-5">
        <span className="font-serif text-lg font-semibold text-violet">
          Reader<span className="text-ink">OS</span>
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-amber-light text-amber px-3 py-1.5 rounded-full text-xs font-semibold">
            🔥 {profile?.streak_days ?? 0}
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-coral">
            ♥ 5
          </div>
          <a href="/profile" className="w-8 h-8 rounded-full bg-violet-light text-violet flex items-center justify-center text-xs font-semibold">
            {(profile?.user_name ?? "R")[0].toUpperCase()}
          </a>
        </div>
      </nav>

      {/* Page content */}
      <main className="pb-20">{children}</main>

      {/* Bottom tab bar */}
      <MobileNav />
    </div>
  );
}
