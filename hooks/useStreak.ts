"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";

export interface StreakState {
  days: number;
  lastReadAt: Date | null;
  hasReadToday: boolean;
  hoursUntilMidnight: number;
  minutesUntilMidnight: number;
  isFrozen: boolean;
  frozenUntil: Date | null;
  loading: boolean;
}

export function useStreak() {
  const [state, setState] = useState<StreakState>({
    days: 0,
    lastReadAt: null,
    hasReadToday: false,
    hoursUntilMidnight: 0,
    minutesUntilMidnight: 0,
    isFrozen: false,
    frozenUntil: null,
    loading: true,
  });

  const supabase = createClient();

  function getMidnightCountdown() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const msLeft = midnight.getTime() - now.getTime();
    return {
      hours: Math.floor(msLeft / 3600000),
      minutes: Math.floor((msLeft % 3600000) / 60000),
    };
  }

  function checkReadToday(lastReadAt: Date | null): boolean {
    if (!lastReadAt) return false;
    const now = new Date();
    const last = new Date(lastReadAt);
    return (
      last.getDate() === now.getDate() &&
      last.getMonth() === now.getMonth() &&
      last.getFullYear() === now.getFullYear()
    );
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setState(s => ({ ...s, loading: false })); return; }

      const { data } = await supabase
        .from("user_profiles")
        .select("streak_days, last_read_at, streak_frozen_until")
        .eq("id", user.id)
        .single();

      if (data) {
        const lastReadAt = data.last_read_at ? new Date(data.last_read_at) : null;
        const frozenUntil = data.streak_frozen_until ? new Date(data.streak_frozen_until) : null;
        const now = new Date();
        const countdown = getMidnightCountdown();

        setState({
          days: data.streak_days,
          lastReadAt,
          hasReadToday: checkReadToday(lastReadAt),
          hoursUntilMidnight: countdown.hours,
          minutesUntilMidnight: countdown.minutes,
          isFrozen: frozenUntil ? frozenUntil > now : false,
          frozenUntil,
          loading: false,
        });
      } else {
        setState(s => ({ ...s, loading: false }));
      }
    }
    load();

    // Update countdown every minute
    const interval = setInterval(() => {
      const countdown = getMidnightCountdown();
      setState(s => ({
        ...s,
        hoursUntilMidnight: countdown.hours,
        minutesUntilMidnight: countdown.minutes,
      }));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Call after a reading session to update locally
  const markReadToday = useCallback((newStreakDays: number) => {
    setState(s => ({
      ...s,
      days: newStreakDays,
      lastReadAt: new Date(),
      hasReadToday: true,
    }));
  }, []);

  // Streak urgency level — drives UI copy and color
  const urgency: "safe" | "warning" | "danger" = (() => {
    if (state.hasReadToday) return "safe";
    if (state.hoursUntilMidnight <= 2) return "danger";
    if (state.hoursUntilMidnight <= 6) return "warning";
    return "safe";
  })();

  // Urgency copy for UI
  const urgencyCopy: Record<typeof urgency, string> = {
    safe:    state.hasReadToday ? "Read today ✓" : "Read today to keep your streak",
    warning: `${state.hoursUntilMidnight}h left to read today`,
    danger:  `Only ${state.minutesUntilMidnight}min left! Don't break your streak`,
  };

  return {
    ...state,
    urgency,
    urgencyCopy: urgencyCopy[urgency],
    markReadToday,
  };
}
