-- ============================================================
-- Migration 005 — Admin stats RPC functions
-- ============================================================
-- SECURITY DEFINER functions that bypass RLS to return aggregate
-- platform stats. Gated to a single admin email so no other
-- authenticated user can call them.
-- ============================================================

-- Helper: abort if caller is not the admin.
CREATE OR REPLACE FUNCTION public._assert_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.jwt() ->> 'email' IS DISTINCT FROM 'carlosprnt@gmail.com' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
END;
$$;

-- ── 1. User registrations per day (last 30 days) ────────────
CREATE OR REPLACE FUNCTION public.admin_registrations_per_day()
RETURNS TABLE(day date, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._assert_admin();
  RETURN QUERY
    SELECT d.day::date, COALESCE(c.cnt, 0::bigint) AS count
    FROM generate_series(
      (current_date - interval '29 days')::date,
      current_date,
      '1 day'
    ) AS d(day)
    LEFT JOIN (
      SELECT date_trunc('day', u.created_at)::date AS reg_day, count(*)::bigint AS cnt
      FROM auth.users u
      WHERE u.created_at >= current_date - interval '29 days'
      GROUP BY 1
    ) c ON c.reg_day = d.day::date
    ORDER BY d.day;
END;
$$;

-- ── 2. Total user count ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_total_users()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  total bigint;
BEGIN
  PERFORM public._assert_admin();
  SELECT count(*) INTO total FROM auth.users;
  RETURN total;
END;
$$;

-- ── 3. Subscriptions created per day (last 30 days) ─────────
CREATE OR REPLACE FUNCTION public.admin_subscriptions_per_day()
RETURNS TABLE(day date, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._assert_admin();
  RETURN QUERY
    SELECT d.day::date, COALESCE(c.cnt, 0::bigint) AS count
    FROM generate_series(
      (current_date - interval '29 days')::date,
      current_date,
      '1 day'
    ) AS d(day)
    LEFT JOIN (
      SELECT date_trunc('day', s.created_at)::date AS c_day, count(*)::bigint AS cnt
      FROM public.subscriptions s
      WHERE s.created_at >= current_date - interval '29 days'
      GROUP BY 1
    ) c ON c.c_day = d.day::date
    ORDER BY d.day;
END;
$$;

-- ── 4. Top 50 most popular subscriptions ────────────────────
CREATE OR REPLACE FUNCTION public.admin_top_subscriptions()
RETURNS TABLE(name text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._assert_admin();
  RETURN QUERY
    SELECT s.name, count(*)::bigint AS count
    FROM public.subscriptions s
    GROUP BY s.name
    ORDER BY count DESC
    LIMIT 50;
END;
$$;

-- ── 5. Currency distribution ────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_currency_distribution()
RETURNS TABLE(currency text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._assert_admin();
  RETURN QUERY
    SELECT s.currency, count(*)::bigint AS count
    FROM public.subscriptions s
    GROUP BY s.currency
    ORDER BY count DESC;
END;
$$;

-- ── 6. Language / locale distribution ───────────────────────
-- Google OAuth stores the user's locale in raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.admin_locale_distribution()
RETURNS TABLE(locale text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._assert_admin();
  RETURN QUERY
    SELECT COALESCE(u.raw_user_meta_data ->> 'locale', 'unknown') AS locale,
           count(*)::bigint AS count
    FROM auth.users u
    GROUP BY 1
    ORDER BY count DESC;
END;
$$;

-- ── 7. Aggregate monthly spend across all active subs ───────
CREATE OR REPLACE FUNCTION public.admin_total_monthly_spend()
RETURNS TABLE(currency text, total_monthly numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._assert_admin();
  RETURN QUERY
    SELECT s.currency,
           round(sum(
             CASE s.billing_period
               WHEN 'monthly'   THEN s.price_amount / GREATEST(s.billing_interval_count, 1)
               WHEN 'yearly'    THEN s.price_amount / GREATEST(s.billing_interval_count, 1) / 12
               WHEN 'quarterly' THEN s.price_amount / GREATEST(s.billing_interval_count, 1) / 3
               WHEN 'weekly'    THEN s.price_amount / GREATEST(s.billing_interval_count, 1) * 4.345
               ELSE s.price_amount / GREATEST(s.billing_interval_count, 1)
             END
           ), 2) AS total_monthly
    FROM public.subscriptions s
    WHERE s.status = 'active'
    GROUP BY s.currency
    ORDER BY total_monthly DESC;
END;
$$;

-- ── 8. Category distribution ────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_category_distribution()
RETURNS TABLE(category text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._assert_admin();
  RETURN QUERY
    SELECT s.category, count(*)::bigint AS count
    FROM public.subscriptions s
    GROUP BY s.category
    ORDER BY count DESC;
END;
$$;

-- Permissions: only authenticated users can call (admin check is inside).
REVOKE ALL ON FUNCTION public._assert_admin FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._assert_admin TO authenticated;

REVOKE ALL ON FUNCTION public.admin_registrations_per_day FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_registrations_per_day TO authenticated;

REVOKE ALL ON FUNCTION public.admin_total_users FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_total_users TO authenticated;

REVOKE ALL ON FUNCTION public.admin_subscriptions_per_day FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_subscriptions_per_day TO authenticated;

REVOKE ALL ON FUNCTION public.admin_top_subscriptions FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_top_subscriptions TO authenticated;

REVOKE ALL ON FUNCTION public.admin_currency_distribution FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_currency_distribution TO authenticated;

REVOKE ALL ON FUNCTION public.admin_locale_distribution FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_locale_distribution TO authenticated;

REVOKE ALL ON FUNCTION public.admin_total_monthly_spend FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_total_monthly_spend TO authenticated;

REVOKE ALL ON FUNCTION public.admin_category_distribution FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_category_distribution TO authenticated;
