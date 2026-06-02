-- ============================================================
-- Migration 006 — Add missing subscription columns & relax status
-- ============================================================
-- Adds start_date, end_date, payment_method columns that the
-- mobile edit form now supports but the DB didn't have yet.
-- Also allows 'ended' status (previously only active/paused/
-- cancelled/trial were valid).
-- ============================================================

-- Drop the old status constraint and replace with one that includes 'ended'
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'cancelled', 'trial', 'ended'));

-- Add optional start_date column
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS start_date DATE;

-- Add optional end_date column
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add optional payment_method column
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_method TEXT;
