"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Archetype } from "@/types/database";

export interface UserProfile {
  id: string;
  user_name: string;
  avatar_url: string | null;
  curiosity: number;
  logic: number;
  empathy: number;
  risk: number;
  trust: number;
  current_archetype: Archetype;
  rare_archetype: string | null;
  active_book_id: number | null;
  streak_days: number;
  xp: number;
  books_completed: number;
  total_choices_made: number;
  onboarding_complete: boolean;
}

export function useUser() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);

      if (u) {
        const { data } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", u.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    }

    load();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return { user, profile, loading, signOut };
}
