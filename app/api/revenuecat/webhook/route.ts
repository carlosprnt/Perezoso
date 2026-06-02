import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── RevenueCat Webhook ───────────────────────────────────────────────────────
// RevenueCat → this endpoint → updates profiles.is_pro in Supabase.
// This keeps web in sync with the same Pro entitlement without needing
// the Purchases SDK (which is native-only).
//
// Setup in RevenueCat dashboard:
//   Integrations → Webhooks → URL: https://yourapp.com/api/revenuecat/webhook
//   Authorization header: REVENUECAT_WEBHOOK_SECRET

const EVENTS_GRANTING_PRO = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'TRANSFER',
])

const EVENTS_REVOKING_PRO = new Set([
  'EXPIRATION',
  'CANCELLATION',
  'BILLING_ISSUE',
])

export async function POST(req: NextRequest) {
  // Verify shared secret
  const authHeader = req.headers.get('Authorization')
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const event = body?.event

  if (!event) return NextResponse.json({ ok: true })

  const { type, app_user_id, entitlement_ids = [] } = event
  const hasPro = (entitlement_ids as string[]).includes('pro')

  // Only act on pro-entitlement events
  if (!hasPro && !EVENTS_REVOKING_PRO.has(type)) {
    return NextResponse.json({ ok: true })
  }

  const isPro = EVENTS_GRANTING_PRO.has(type)
    ? true
    : EVENTS_REVOKING_PRO.has(type)
      ? false
      : null

  if (isPro === null) return NextResponse.json({ ok: true })

  // Update Supabase profile
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error } = await supabase
    .from('profiles')
    .update({ is_pro: isPro, updated_at: new Date().toISOString() })
    .eq('id', app_user_id)

  if (error) {
    console.error('[RC webhook] Supabase update failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
