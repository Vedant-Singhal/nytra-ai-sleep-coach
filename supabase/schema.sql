-- ============================================================
-- Sleep Tracker — Supabase Schema
-- ============================================================

-- ── STEP 1: Create all tables first ──────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username         TEXT UNIQUE NOT NULL,
  avatar_url       TEXT,
  wake_goal_hour   INT   NOT NULL DEFAULT 7,
  wake_goal_minute INT   NOT NULL DEFAULT 0,
  sleep_goal_hours FLOAT NOT NULL DEFAULT 8.0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS public.sleep_sessions (
  id               TEXT PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score            INT  NOT NULL CHECK (score >= 0 AND score <= 100),
  duration_minutes INT  NOT NULL,
  bedtime          TIMESTAMPTZ NOT NULL,
  wake_time        TIMESTAMPTZ NOT NULL,
  motion_index     FLOAT NOT NULL DEFAULT 0.5,
  is_shared        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kudos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    TEXT NOT NULL REFERENCES public.sleep_sessions(id) ON DELETE CASCADE,
  from_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_emoji TEXT NOT NULL DEFAULT '💪' CHECK (reaction_emoji IN ('💤','💪','🔥')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, from_user_id)
);

ALTER TABLE public.kudos
  ADD COLUMN IF NOT EXISTS reaction_emoji TEXT NOT NULL DEFAULT '💪';

ALTER TABLE public.kudos
  DROP CONSTRAINT IF EXISTS kudos_reaction_emoji_check;

ALTER TABLE public.kudos
  ADD CONSTRAINT kudos_reaction_emoji_check
  CHECK (reaction_emoji IN ('💤','💪','🔥'));

-- ── STEP 2: Enable RLS on all tables ─────────────────────────

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kudos           ENABLE ROW LEVEL SECURITY;

-- ── STEP 3: RLS policies ──────────────────────────────────────

-- profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- follows
CREATE POLICY "Follows are viewable by authenticated users"
  ON public.follows FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- sleep_sessions
CREATE POLICY "Users can read own sessions"
  ON public.sleep_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Shared sessions from followed users are readable"
  ON public.sleep_sessions FOR SELECT USING (
    is_shared = TRUE AND
    user_id IN (
      SELECT following_id FROM public.follows WHERE follower_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own sessions"
  ON public.sleep_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.sleep_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.sleep_sessions FOR DELETE USING (auth.uid() = user_id);

-- kudos
CREATE POLICY "Kudos are readable by authenticated users"
  ON public.kudos FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can give kudos"
  ON public.kudos FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can remove own kudos"
  ON public.kudos FOR DELETE USING (auth.uid() = from_user_id);

-- ── STEP 4: Indexes ───────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_id ON public.sleep_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_shared  ON public.sleep_sessions(is_shared, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower       ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following      ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_kudos_session          ON public.kudos(session_id);
