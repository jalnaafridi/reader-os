export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Archetype = "INVESTIGATOR" | "STRATEGIST" | "EXPLORER" | "DIPLOMAT" | "GUARDIAN" | "REBEL";
export type Genre = "MYSTERY" | "THRILLER" | "FANTASY" | "ROMANCE" | "LITERARY";
export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type TrubyStep = "WEAKNESS_AND_NEED" | "DESIRE" | "OPPONENT_APPEARS" | "PLAN" | "BATTLE" | "SELF_REVELATION" | "NEW_EQUILIBRIUM";

export interface TraitDeltas {
  curiosity?: number;
  logic?: number;
  empathy?: number;
  risk?: number;
  trust?: number;
}

export interface ReaderGenome {
  curiosity: number;
  logic: number;
  empathy?: number;
  risk?: number;
  trust?: number;
}

export type Database = {
  public: {
    Tables: {
      books: {
        Row: {
          id: number;
          open_library_id: string;
          title: string;
          author: string;
          description: string;
          cover_url: string;
          cover_color: string;
          genre: Genre;
          difficulty: Difficulty;
          designing_question: string;
          identity_theme: string;
          archetype_affinity: Archetype[];
          total_chapters: number;
          is_published: boolean;
          created_at: string;
        };
      };
      chapters: {
        Row: {
          id: number;
          book_id: number;
          order: number;
          title: string;
          truby_step: TrubyStep;
          description: string;
          dominant_emotion: string;
        };
      };
      scenes: {
        Row: {
          id: number;
          chapter_id: number;
          order: number;
          title: string;
          content: string;
          choice_context: string;
          choice_question: string;
          identity_mirror: string;
        };
      };
      choices: {
        Row: {
          id: number;
          scene_id: number;
          text: string;
          consequence: string;
          trait_deltas: TraitDeltas;
          trait_label: string;
          archetype_signal: Archetype;
          identity_insight: string;
        };
      };
      user_profiles: {
        Row: {
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
          last_read_at: string | null;
          xp: number;
          books_completed: number;
          total_choices_made: number;
          onboarding_complete: boolean;
          onboarding_answers: Json;
          created_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_profiles"]["Row"]>;
      };
      scene_progress: {
        Row: {
          id: number;
          user_id: string;
          scene_id: number;
          choice_id: number;
          completed: boolean;
          created_at: string;
        };
        Insert: { user_id: string; scene_id: number; choice_id: number; completed?: boolean };
      };
      book_progress: {
        Row: {
          id: number;
          user_id: string;
          book_id: number;
          current_chapter_order: number;
          completed: boolean;
          completed_at: string | null;
          started_at: string;
        };
      };
      book_analytics: {
        Row: {
          id: number;
          scene_id: number;
          choice_id: number;
          choice_count: number;
          archetype_counts: Json;
          updated_at: string;
        };
      };
      pipeline_jobs: {
        Row: {
          id: string;
          book_title: string;
          genre: Genre | null;
          status: string;
          progress: number;
          book_id: number | null;
          error: string | null;
          tokens_used: number;
          started_at: string;
          completed_at: string | null;
        };
      };
    };
  };
};

export const ARCHETYPE_META: Record<Archetype, { label: string; emoji: string; summary: string; color: string }> = {
  INVESTIGATOR: { label: "The Investigator", emoji: "🔍", summary: "You gather before you act. Evidence over instinct.", color: "#6d4fc2" },
  STRATEGIST: { label: "The Strategist", emoji: "🧠", summary: "You think three moves ahead. Logic anchors you.", color: "#185fa5" },
  EXPLORER: { label: "The Explorer", emoji: "🌍", summary: "You move before you're ready. Certainty is overrated.", color: "#c44828" },
  DIPLOMAT: { label: "The Diplomat", emoji: "🕊️", summary: "You read the room. Relationships are your intelligence.", color: "#1a9070" },
  GUARDIAN: { label: "The Guardian", emoji: "🛡️", summary: "You protect what matters. Loyalty is wisdom.", color: "#c07818" },
  REBEL: { label: "The Rebel", emoji: "⚡", summary: "You challenge the expected. Your judgment first.", color: "#8b6dd6" },
};

export const GENRE_META: Record<Genre, { label: string; emoji: string; color: string; question: string }> = {
  MYSTERY: { label: "Mystery", emoji: "🔍", color: "#1a1714", question: "How much truth does justice require?" },
  THRILLER: { label: "Thriller", emoji: "🌆", color: "#0f1f0f", question: "How far would you go to protect what matters?" },
  FANTASY: { label: "Fantasy", emoji: "⚔️", color: "#1a0f2e", question: "When does duty become a cage?" },
  ROMANCE: { label: "Romance", emoji: "💘", color: "#2e0f1a", question: "What are you willing to risk for connection?" },
  LITERARY: { label: "Literary", emoji: "📜", color: "#0f1a1a", question: "What does it cost to see yourself clearly?" },
};

export function computeArchetype(g: { curiosity: number; logic: number; empathy: number; risk: number; trust: number }): Archetype {
  if (g.risk >= 65 && g.curiosity >= 55) return "EXPLORER";
  if (g.curiosity >= 65 && g.logic >= 55) return "INVESTIGATOR";
  if (g.logic >= 65 && g.risk < 50) return "STRATEGIST";
  if (g.empathy >= 65 && g.trust >= 55) return "DIPLOMAT";
  if (g.trust >= 65 && g.risk < 45) return "GUARDIAN";
  const scores = [["curiosity", g.curiosity], ["logic", g.logic], ["empathy", g.empathy], ["risk", g.risk], ["trust", g.trust]] as [string, number][];
  const top = scores.sort((a, b) => b[1] - a[1])[0][0];
  return ({ curiosity: "INVESTIGATOR", logic: "STRATEGIST", empathy: "DIPLOMAT", risk: "EXPLORER", trust: "GUARDIAN" } as Record<string, Archetype>)[top] || "REBEL";
}
