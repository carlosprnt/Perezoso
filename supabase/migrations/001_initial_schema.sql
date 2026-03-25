-- ============================================================
-- PEREZOSO — Initial Schema
-- ============================================================
-- Run this in Supabase SQL Editor or via supabase db push
-- ============================================================

-- Enable UUID generation (available by default in Supabase)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- only needed on self-hosted

-- ============================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                    UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  name                  TEXT            NOT NULL,
  logo_url              TEXT,

  -- Classification
  category              TEXT            NOT NULL DEFAULT 'other',

  -- Pricing
  price_amount          NUMERIC(10, 2)  NOT NULL CHECK (price_amount >= 0),
  currency              TEXT            NOT NULL DEFAULT 'EUR',

  -- Billing cycle
  -- Values: monthly | yearly | quarterly | weekly | custom
  billing_period        TEXT            NOT NULL DEFAULT 'monthly',
  billing_interval_count INTEGER        DEFAULT 1 CHECK (billing_interval_count > 0),

  -- Dates
  next_billing_date     DATE,
  trial_end_date        DATE,

  -- Status: active | paused | cancelled | trial
  status                TEXT            NOT NULL DEFAULT 'active',

  -- Sharing
  is_shared             BOOLEAN         NOT NULL DEFAULT false,
  shared_with_count     INTEGER         DEFAULT 1 CHECK (shared_with_count >= 1),
  -- split_evenly | custom
  user_share_mode       TEXT            DEFAULT 'split_evenly',
  -- used when user_share_mode = 'custom'
  user_share_amount     NUMERIC(10, 2)  CHECK (user_share_amount >= 0),

  -- Meta
  notes                 TEXT,
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_billing_period CHECK (billing_period IN ('monthly', 'yearly', 'quarterly', 'weekly', 'custom')),
  CONSTRAINT valid_status         CHECK (status IN ('active', 'paused', 'cancelled', 'trial')),
  CONSTRAINT valid_user_share_mode CHECK (user_share_mode IN ('split_evenly', 'custom')),
  CONSTRAINT valid_category       CHECK (category IN (
    'streaming', 'music', 'productivity', 'cloud', 'ai',
    'health', 'gaming', 'education', 'mobility', 'home', 'other'
  )),
  -- When shared, must have at least 2 people
  CONSTRAINT shared_count_check   CHECK (
    (is_shared = false) OR (is_shared = true AND shared_with_count >= 2)
  ),
  -- custom share requires custom amount
  CONSTRAINT custom_share_check   CHECK (
    user_share_mode != 'custom' OR user_share_amount IS NOT NULL
  )
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx
  ON public.subscriptions(user_id);

CREATE INDEX IF NOT EXISTS subscriptions_status_idx
  ON public.subscriptions(user_id, status);

CREATE INDEX IF NOT EXISTS subscriptions_next_billing_date_idx
  ON public.subscriptions(user_id, next_billing_date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscriptions
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert subscriptions for themselves
CREATE POLICY "subscriptions_insert_own"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own subscriptions
CREATE POLICY "subscriptions_update_own"
  ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own subscriptions
CREATE POLICY "subscriptions_delete_own"
  ON public.subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- PROFILES TABLE (optional, for display name / avatar)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID  PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_upsert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
