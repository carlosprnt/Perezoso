-- ============================================================
-- Migration 003 — Allow custom user-defined categories
-- ============================================================
-- The original schema locked the `category` column to a fixed
-- enum of 11 values via a CHECK constraint. Users can now create
-- their own categories from Settings, and we want those to persist
-- natively instead of being silently mapped to 'other'.
--
-- We keep the column as TEXT (already is) and drop the CHECK so any
-- non-empty string is accepted. Validation of allowed values moves
-- to the application layer (TS Category type + per-user preferences).
-- ============================================================

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS valid_category;

-- Make sure the default stays sensible for rows without an explicit value.
ALTER TABLE public.subscriptions
  ALTER COLUMN category SET DEFAULT 'other';
