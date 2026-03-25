-- ============================================================
-- PEREZOSO — Seed Data
-- ============================================================
-- Replace 'YOUR_USER_ID' with a real user UUID from auth.users
-- Run after 001_initial_schema.sql and after creating a test user
-- ============================================================

-- Usage:
-- 1. Create a user via the app (login with Google)
-- 2. Copy their UUID from Supabase Auth > Users
-- 3. Replace placeholder below and run in SQL Editor

DO $$
DECLARE
  uid UUID := 'YOUR_USER_ID'; -- <-- replace this
BEGIN

INSERT INTO public.subscriptions
  (user_id, name, logo_url, category, price_amount, currency, billing_period, next_billing_date, status, is_shared, shared_with_count, user_share_mode, notes)
VALUES
  -- Streaming
  (uid, 'Netflix',        'https://cdn.brandfetch.io/idB38nBDmO/w/400/h/400/theme/dark/icon.jpeg', 'streaming',    17.99,  'EUR', 'monthly',   CURRENT_DATE + INTERVAL '5 days',   'active',    true,  3, 'split_evenly', 'Familiar con familia'),
  (uid, 'Spotify',        'https://cdn.brandfetch.io/idwjf3b_BG/w/400/h/400/theme/dark/icon.jpeg', 'music',        9.99,   'EUR', 'monthly',   CURRENT_DATE + INTERVAL '12 days',  'active',    false, 1, 'split_evenly', NULL),
  (uid, 'Disney+',        'https://cdn.brandfetch.io/idxlPB-BT7/w/400/h/400/theme/dark/icon.jpeg', 'streaming',    109.90, 'EUR', 'yearly',    CURRENT_DATE + INTERVAL '120 days', 'active',    true,  4, 'split_evenly', NULL),
  (uid, 'Apple TV+',      NULL,                                                                     'streaming',    8.99,   'EUR', 'monthly',   CURRENT_DATE + INTERVAL '20 days',  'active',    false, 1, 'split_evenly', NULL),
  -- Productivity
  (uid, 'Notion',         'https://cdn.brandfetch.io/idnRfkbXJc/w/400/h/400/theme/dark/icon.jpeg', 'productivity', 16.00,  'EUR', 'monthly',   CURRENT_DATE + INTERVAL '3 days',   'active',    false, 1, 'split_evenly', 'Plan Plus'),
  (uid, 'Linear',         NULL,                                                                     'productivity', 8.00,   'USD', 'monthly',   CURRENT_DATE + INTERVAL '18 days',  'active',    false, 1, 'split_evenly', NULL),
  -- Cloud
  (uid, 'iCloud',         'https://cdn.brandfetch.io/idTBc9LZQF/w/400/h/400/theme/dark/icon.jpeg', 'cloud',        2.99,   'EUR', 'monthly',   CURRENT_DATE + INTERVAL '7 days',   'active',    false, 1, 'split_evenly', '50GB plan'),
  (uid, 'GitHub',         'https://cdn.brandfetch.io/idZAyF9RL1/w/400/h/400/theme/dark/icon.jpeg', 'cloud',        4.00,   'USD', 'monthly',   CURRENT_DATE + INTERVAL '1 days',   'active',    false, 1, 'split_evenly', 'Pro'),
  -- AI
  (uid, 'ChatGPT Plus',   NULL,                                                                     'ai',           20.00,  'USD', 'monthly',   CURRENT_DATE + INTERVAL '15 days',  'active',    false, 1, 'split_evenly', NULL),
  (uid, 'Claude Pro',     NULL,                                                                     'ai',           20.00,  'USD', 'monthly',   CURRENT_DATE + INTERVAL '22 days',  'active',    false, 1, 'split_evenly', NULL),
  -- Gaming
  (uid, 'Xbox Game Pass', NULL,                                                                     'gaming',       14.99,  'EUR', 'monthly',   CURRENT_DATE + INTERVAL '9 days',   'paused',    false, 1, 'split_evenly', NULL),
  -- Health
  (uid, 'Headspace',      NULL,                                                                     'health',       69.99,  'EUR', 'yearly',    CURRENT_DATE + INTERVAL '200 days', 'active',    false, 1, 'split_evenly', NULL),
  -- Education
  (uid, 'Coursera Plus',  NULL,                                                                     'education',    399.00, 'EUR', 'yearly',    CURRENT_DATE + INTERVAL '60 days',  'cancelled', false, 1, 'split_evenly', 'No renovar'),
  -- Trial
  (uid, 'Figma',          'https://cdn.brandfetch.io/id4KTodYAM/w/400/h/400/theme/dark/icon.jpeg', 'productivity', 15.00,  'EUR', 'monthly',   CURRENT_DATE + INTERVAL '14 days',  'trial',     false, 1, 'split_evenly', NULL);

END $$;
