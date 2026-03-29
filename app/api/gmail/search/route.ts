import { NextRequest, NextResponse } from 'next/server'
import { detectSubscriptionsFromEmails, type GmailMessageHeader, KNOWN_DOMAINS } from '@/lib/subscription-detection'

// ── Gmail search query ────────────────────────────────────────────────────────
// Two-pronged strategy:
//   1. Subject keywords (English + Spanish) → catch generic billing emails
//   2. from: known domains → catch emails with non-standard subjects (e.g. "Enjoy Netflix")
// Combined with OR so either condition is sufficient.

const buildGmailQuery = () => {
  const subjectTerms = [
    // English
    'receipt', 'invoice', 'subscription', 'renewal', 'billing',
    'charged', 'membership', 'billed', '"payment confirmation"',
    '"payment processed"', '"payment received"', '"order confirmation"',
    '"your plan"', '"auto-renewal"', 'statement',
    // Spanish
    'factura', 'suscripción', 'renovación', 'cobro', 'cargo',
    '"confirmación de pago"', '"recibo de pago"', '"confirmación de pedido"',
    '"tu plan"', 'membresía', '"pago realizado"', '"pago confirmado"',
    // French / German / Italian (common in Europe)
    'abonnement', 'rechnung', 'abbonamento', 'reçu',
  ].map(t => `subject:${t}`).join(' OR ')

  const fromTerms = KNOWN_DOMAINS
    .slice(0, 30) // Gmail query length limit ~500 chars for from: terms
    .map(d => `from:@${d}`)
    .join(' OR ')

  return `(${subjectTerms} OR ${fromTerms}) newer_than:18m -in:spam`
}

const GMAIL_SEARCH_QUERY = buildGmailQuery()

interface GmailMessageRef { id: string }
interface GmailHeader { name: string; value: string }
interface GmailMessage {
  id: string
  snippet?: string
  payload?: { headers?: GmailHeader[] }
}

async function fetchJson<T>(url: string, token: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  })
  if (res.status === 401) throw new Error('token_expired')
  if (!res.ok) return null
  return res.json() as Promise<T>
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token =
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ??
    request.cookies.get('gmail_token')?.value ??
    null

  // ── Mock mode ──────────────────────────────────────────────────────────────
  const isMock =
    process.env.GMAIL_MOCK === 'true' ||
    (!token && process.env.NODE_ENV === 'development')

  if (isMock) {
    const { MOCK_GMAIL_MESSAGES } = await import('@/lib/gmail-mock')
    const candidates = detectSubscriptionsFromEmails(MOCK_GMAIL_MESSAGES)
    return NextResponse.json({ status: 'ok', candidates })
  }

  if (!token) {
    return NextResponse.json({ status: 'not_connected', candidates: [] })
  }

  try {
    // 1. Search Gmail — paginate up to 400 results (Gmail max per page = 500)
    const allMessageIds: string[] = []
    let pageToken: string | undefined

    while (allMessageIds.length < 400) {
      const remaining = 400 - allMessageIds.length
      const pageSize = Math.min(remaining, 500)
      const url =
        `https://gmail.googleapis.com/gmail/v1/users/me/messages` +
        `?q=${encodeURIComponent(GMAIL_SEARCH_QUERY)}&maxResults=${pageSize}&fields=messages(id),nextPageToken` +
        (pageToken ? `&pageToken=${pageToken}` : '')

      const page = await fetchJson<{ messages?: GmailMessageRef[]; nextPageToken?: string }>(url, token)
      const ids = (page?.messages ?? []).map(m => m.id)
      allMessageIds.push(...ids)
      pageToken = page?.nextPageToken
      if (!pageToken || ids.length === 0) break
    }

    const messageIds = allMessageIds.slice(0, 400)

    if (messageIds.length === 0) {
      return NextResponse.json({ status: 'ok', candidates: [] })
    }

    // 2. Fetch metadata + snippet in batches of 50 to avoid rate limits
    const metaUrl = (id: string) =>
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}` +
      `?format=minimal&fields=id,snippet,payload/headers`

    const BATCH = 50
    const rawMessages: (GmailMessage | null)[] = []
    for (let i = 0; i < messageIds.length; i += BATCH) {
      const chunk = messageIds.slice(i, i + BATCH)
      const results = await Promise.all(
        chunk.map(id => fetchJson<GmailMessage>(metaUrl(id), token).catch(() => null)),
      )
      rawMessages.push(...results)
    }

    // 3. Parse into flat objects
    const headers: GmailMessageHeader[] = rawMessages
      .filter((m): m is GmailMessage => !!m)
      .map(msg => {
        const hdr: Record<string, string> = {}
        for (const h of msg.payload?.headers ?? []) {
          hdr[h.name.toLowerCase()] = h.value
        }
        return {
          id: msg.id,
          from: hdr.from ?? '',
          subject: hdr.subject ?? '',
          date: hdr.date ?? '',
          snippet: msg.snippet ?? '',
        }
      })
      .filter(h => h.from)

    // 4. Run detection
    const candidates = detectSubscriptionsFromEmails(headers)

    return NextResponse.json({ status: 'ok', candidates })
  } catch (err) {
    const isExpired = err instanceof Error && err.message === 'token_expired'
    if (isExpired) {
      const res = NextResponse.json({ status: 'not_connected', candidates: [] })
      res.cookies.set('gmail_token', '', { maxAge: 0, path: '/' })
      return res
    }
    console.error('[gmail/search]', err)
    return NextResponse.json({ status: 'error', candidates: [], error: 'Search failed' })
  }
}
