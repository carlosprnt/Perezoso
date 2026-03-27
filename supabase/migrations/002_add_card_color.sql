-- ============================================================
-- PEREZOSO — Add card_color to subscriptions
-- Run in Supabase SQL Editor or via supabase db push
-- ============================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS card_color TEXT DEFAULT NULL;
