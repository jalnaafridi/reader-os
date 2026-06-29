-- ═══════════════════════════════════════════════════════════
--  READER OS — COMPLETE SUPABASE SQL SETUP
--  Run this in Supabase SQL Editor (Dashboard → SQL Editor)
--  Paste and run in one go. Safe to re-run (IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════

-- ── Enable required extensions ────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;  -- For genome similarity search

-- ═══════════════════════════════════════════════════════════
--  ENUMS
-- ═══════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE genre_type AS ENUM ('MYSTERY','THRILLER','FANTASY','ROMANCE','LITERARY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE archetype_type AS ENUM (
    'INVESTIGATOR','STRATEGIST','EXPLORER','DIPLOMAT','GUARDIAN','REBEL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE difficulty_type AS ENUM ('BEGINNER','INTERMEDIATE','ADVANCED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE truby_step_type AS ENUM (
    'WEAKNESS_AND_NEED','DESIRE','OPPONENT_APPEARS',
    'PLAN','BATTLE','SELF_REVELATION','NEW_EQUILIBRIUM'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pipeline_status AS ENUM (
    'QUEUED','FETCHING','ANALYZING','GENERATING','VALIDATING','SEEDING','COMPLETE','FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════
--  CORE CONTENT TABLES
-- ═══════════════════════════════════════════════════════════

-- ── Books ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  id                  SERIAL PRIMARY KEY,
  open_library_id     TEXT UNIQUE NOT NULL,
  title               TEXT NOT NULL,
  author              TEXT NOT NULL DEFAULT 'Unknown',
  description         TEXT NOT NULL,
  cover_url           TEXT NOT NULL DEFAULT '/placeholder-cover.jpg',
  cover_color         TEXT NOT NULL DEFAULT '#1a1714',
  genre               genre_type NOT NULL,
  difficulty          difficulty_type NOT NULL DEFAULT 'INTERMEDIATE',
  designing_question  TEXT NOT NULL,  -- Truby's core moral question
  identity_theme      TEXT NOT NULL DEFAULT '',
  archetype_affinity  archetype_type[] NOT NULL DEFAULT '{}',
  total_chapters      INTEGER NOT NULL DEFAULT 0,
  is_published        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Chapters ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chapters (
  id                SERIAL PRIMARY KEY,
  book_id           INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  "order"           INTEGER NOT NULL,
  title             TEXT NOT NULL,
  truby_step        truby_step_type NOT NULL,
  description       TEXT NOT NULL,
  dominant_emotion  TEXT NOT NULL DEFAULT 'tension',
  UNIQUE(book_id, "order")
);

-- ── Scenes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scenes (
  id                SERIAL PRIMARY KEY,
  chapter_id        INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  "order"           INTEGER NOT NULL,
  title             TEXT NOT NULL,
  content           TEXT NOT NULL,      -- Full prose (~300 words)
  choice_context    TEXT NOT NULL,      -- Setup for the choice moment
  choice_question   TEXT NOT NULL,      -- The question shown to the reader
  identity_mirror   TEXT NOT NULL DEFAULT '', -- What this scene reveals
  UNIQUE(chapter_id, "order")
);

-- ── Choices ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS choices (
  id                SERIAL PRIMARY KEY,
  scene_id          INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  text              TEXT NOT NULL,
  consequence       TEXT NOT NULL,         -- What happens after this choice
  trait_deltas      JSONB NOT NULL DEFAULT '{}'::jsonb,
  trait_label       TEXT NOT NULL,
  archetype_signal  archetype_type,
  identity_insight  TEXT NOT NULL DEFAULT '' -- "You chose X because you..."
);


-- ═══════════════════════════════════════════════════════════
--  USER TABLES
-- ═══════════════════════════════════════════════════════════

-- ── User profiles + Reader Genome ─────────────────────────
-- Note: auth.users is created automatically by Supabase Auth
-- This table extends it with Reader OS-specific data
CREATE TABLE IF NOT EXISTS user_profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name             TEXT NOT NULL DEFAULT 'Reader',
  avatar_url            TEXT,

  -- Reader Genome (0-100 each, start at 50)
  curiosity             INTEGER NOT NULL DEFAULT 50 CHECK (curiosity BETWEEN 0 AND 100),
  logic                 INTEGER NOT NULL DEFAULT 50 CHECK (logic BETWEEN 0 AND 100),
  empathy               INTEGER NOT NULL DEFAULT 50 CHECK (empathy BETWEEN 0 AND 100),
  risk                  INTEGER NOT NULL DEFAULT 50 CHECK (risk BETWEEN 0 AND 100),
  trust                 INTEGER NOT NULL DEFAULT 50 CHECK (trust BETWEEN 0 AND 100),

  -- Computed from genome (updated after each choice)
  current_archetype     archetype_type DEFAULT 'INVESTIGATOR',
  rare_archetype        TEXT,           -- e.g. "Shadow Investigator" — unlocked by patterns

  -- Genome vector for similarity search (pgvector)
  -- Stored as [curiosity/100, logic/100, empathy/100, risk/100, trust/100]
  genome_vector         vector(5),

  -- Active reading
  active_book_id        INTEGER REFERENCES books(id),
  streak_days           INTEGER NOT NULL DEFAULT 0,
  last_read_at          TIMESTAMPTZ,
  streak_frozen_until   TIMESTAMPTZ,   -- Streak freeze protection

  -- Stats
  xp                    INTEGER NOT NULL DEFAULT 0,
  books_completed       INTEGER NOT NULL DEFAULT 0,
  total_choices_made    INTEGER NOT NULL DEFAULT 0,

  -- Onboarding
  onboarding_complete   BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_answers    JSONB DEFAULT '{}'::jsonb,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Scene progress (which choice was made in each scene) ──
CREATE TABLE IF NOT EXISTS scene_progress (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_id    INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  choice_id   INTEGER NOT NULL REFERENCES choices(id) ON DELETE CASCADE,
  completed   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, scene_id)  -- One choice per scene per user
);

-- ── Book progress (track completion per book per user) ────
CREATE TABLE IF NOT EXISTS book_progress (
  id                    SERIAL PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id               INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  current_chapter_order INTEGER NOT NULL DEFAULT 1,
  completed             BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at          TIMESTAMPTZ,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- ── Book analytics (aggregate choice data — for authors) ─
CREATE TABLE IF NOT EXISTS book_analytics (
  id              SERIAL PRIMARY KEY,
  scene_id        INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  choice_id       INTEGER NOT NULL REFERENCES choices(id) ON DELETE CASCADE,
  choice_count    INTEGER NOT NULL DEFAULT 0,
  archetype_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- {"INVESTIGATOR": 42, "STRATEGIST": 18, ...}
  avg_dwell_ms    INTEGER,   -- Average time spent on choice screen
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scene_id, choice_id)
);

-- ── Open loops (unfinished things that keep users returning)
CREATE TABLE IF NOT EXISTS open_loops (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,  -- 'hidden_scene', 'profile_completion', 'archetype_unlock'
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Variable rewards (unpredictable rewards system) ───────
CREATE TABLE IF NOT EXISTS variable_rewards (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,  -- 'xp_multiplier', 'mirror_moment', 'rare_archetype'
  value           JSONB NOT NULL DEFAULT '{}'::jsonb,
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed         BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── Subscriptions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                        SERIAL PRIMARY KEY,
  user_id                   UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  stripe_customer_id        TEXT UNIQUE,
  stripe_subscription_id    TEXT UNIQUE,
  stripe_price_id           TEXT,
  current_period_end        TIMESTAMPTZ,
  is_active                 BOOLEAN GENERATED ALWAYS AS
                              (current_period_end > NOW()) STORED
);


-- ═══════════════════════════════════════════════════════════
--  AUTHOR TABLES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS author_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  bio         TEXT,
  website     TEXT,
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Pipeline jobs (track AI processing) ───────────────────
CREATE TABLE IF NOT EXISTS pipeline_jobs (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  book_title        TEXT NOT NULL,
  open_library_id   TEXT,
  genre             genre_type,
  status            pipeline_status NOT NULL DEFAULT 'QUEUED',
  progress          INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  book_id           INTEGER REFERENCES books(id),
  error             TEXT,
  tokens_used       INTEGER DEFAULT 0,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);


-- ═══════════════════════════════════════════════════════════
--  INDEXES (performance)
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_books_genre         ON books(genre);
CREATE INDEX IF NOT EXISTS idx_books_published     ON books(is_published);
CREATE INDEX IF NOT EXISTS idx_chapters_book       ON chapters(book_id, "order");
CREATE INDEX IF NOT EXISTS idx_scenes_chapter      ON scenes(chapter_id, "order");
CREATE INDEX IF NOT EXISTS idx_choices_scene       ON choices(scene_id);
CREATE INDEX IF NOT EXISTS idx_scene_progress_user ON scene_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_scene_progress_scene ON scene_progress(scene_id);
CREATE INDEX IF NOT EXISTS idx_book_progress_user  ON book_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_open_loops_user     ON open_loops(user_id) WHERE NOT resolved;

-- Genome vector index for similarity search
CREATE INDEX IF NOT EXISTS idx_genome_vector
  ON user_profiles USING ivfflat (genome_vector vector_cosine_ops)
  WITH (lists = 100);


-- ═══════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

-- Books: anyone can read published books; service role can write
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "books_read" ON books;
CREATE POLICY "books_read" ON books FOR SELECT USING (is_published = TRUE);
DROP POLICY IF EXISTS "books_admin_write" ON books;
CREATE POLICY "books_admin_write" ON books FOR ALL USING (auth.role() = 'service_role');

-- Chapters: readable if book is published
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chapters_read" ON chapters;
CREATE POLICY "chapters_read" ON chapters FOR SELECT USING (
  EXISTS (SELECT 1 FROM books WHERE id = chapters.book_id AND is_published = TRUE)
);

-- Scenes: readable if chapter's book is published
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scenes_read" ON scenes;
CREATE POLICY "scenes_read" ON scenes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chapters c
    JOIN books b ON b.id = c.book_id
    WHERE c.id = scenes.chapter_id AND b.is_published = TRUE
  )
);

-- Choices: same as scenes
ALTER TABLE choices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "choices_read" ON choices;
CREATE POLICY "choices_read" ON choices FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenes s
    JOIN chapters c ON c.id = s.chapter_id
    JOIN books b ON b.id = c.book_id
    WHERE s.id = choices.scene_id AND b.is_published = TRUE
  )
);

-- User profiles: users can only see/edit their own
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_own" ON user_profiles;
CREATE POLICY "profiles_own" ON user_profiles FOR ALL USING (auth.uid() = id);

-- Scene progress: users can only see/create their own
ALTER TABLE scene_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progress_own" ON scene_progress;
CREATE POLICY "progress_own" ON scene_progress FOR ALL USING (auth.uid() = user_id);

-- Book progress: own only
ALTER TABLE book_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "book_progress_own" ON book_progress;
CREATE POLICY "book_progress_own" ON book_progress FOR ALL USING (auth.uid() = user_id);

-- Book analytics: readable by all (aggregate, no PII), writable by service role
ALTER TABLE book_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analytics_read" ON book_analytics;
CREATE POLICY "analytics_read" ON book_analytics FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "analytics_write" ON book_analytics;
CREATE POLICY "analytics_write" ON book_analytics FOR ALL USING (auth.role() = 'service_role');

-- Open loops: own only
ALTER TABLE open_loops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loops_own" ON open_loops;
CREATE POLICY "loops_own" ON open_loops FOR ALL USING (auth.uid() = user_id);

-- Variable rewards: own only
ALTER TABLE variable_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rewards_own" ON variable_rewards;
CREATE POLICY "rewards_own" ON variable_rewards FOR ALL USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
--  DATABASE FUNCTIONS
-- ═══════════════════════════════════════════════════════════

-- Auto-create user_profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_profiles (id, user_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Reader')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update genome_vector when traits change
CREATE OR REPLACE FUNCTION update_genome_vector()
RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
BEGIN
  NEW.genome_vector = ARRAY[
    NEW.curiosity::FLOAT / 100,
    NEW.logic::FLOAT / 100,
    NEW.empathy::FLOAT / 100,
    NEW.risk::FLOAT / 100,
    NEW.trust::FLOAT / 100
  ]::vector;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_genome ON user_profiles;
CREATE TRIGGER update_genome
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_genome_vector();

-- Increment book_analytics choice_count when a choice is made
CREATE OR REPLACE FUNCTION increment_choice_analytics()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER AS $$
DECLARE
  v_archetype TEXT;
BEGIN
  -- Get archetype signal for this choice
  SELECT archetype_signal::TEXT INTO v_archetype
  FROM choices WHERE id = NEW.choice_id;

  INSERT INTO book_analytics (scene_id, choice_id, choice_count, archetype_counts)
  VALUES (
    NEW.scene_id,
    NEW.choice_id,
    1,
    jsonb_build_object(v_archetype, 1)
  )
  ON CONFLICT (scene_id, choice_id) DO UPDATE SET
    choice_count = book_analytics.choice_count + 1,
    archetype_counts = jsonb_set(
      book_analytics.archetype_counts,
      ARRAY[v_archetype],
      to_jsonb(COALESCE((book_analytics.archetype_counts->>v_archetype)::INT, 0) + 1)
    ),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_choice_made ON scene_progress;
CREATE TRIGGER on_choice_made
  AFTER INSERT ON scene_progress
  FOR EACH ROW EXECUTE FUNCTION increment_choice_analytics();

-- Find readers with similar genomes (for "readers like you" feature)
CREATE OR REPLACE FUNCTION find_similar_readers(
  target_user_id UUID,
  result_limit INT DEFAULT 10
)
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  current_archetype archetype_type,
  similarity FLOAT
) LANGUAGE SQL STABLE AS $$
  SELECT
    up.id,
    up.user_name,
    up.current_archetype,
    1 - (up.genome_vector <=> (
      SELECT genome_vector FROM user_profiles WHERE id = target_user_id
    )) AS similarity
  FROM user_profiles up
  WHERE up.id != target_user_id
    AND up.genome_vector IS NOT NULL
  ORDER BY up.genome_vector <=> (
    SELECT genome_vector FROM user_profiles WHERE id = target_user_id
  )
  LIMIT result_limit;
$$;
