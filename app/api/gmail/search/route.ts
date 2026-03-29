import { NextRequest, NextResponse } from 'next/server'
import { detectSubscriptionsFromEmails, type GmailMessageHeader, KNOWN_DOMAINS } from '@/lib/subscription-detection'

// ── Search strategy ──────────────────────────────────────────────────────────
// We run TWO independent searches in parallel and merge their results:
//
//  A) DOMAIN search  — from:@netflix.com OR from:@spotify.com OR …
//     Language-agnostic: catches any email from a known subscription service
//     regardless of the subject language ("Enjoy Netflix", "Tu plan de Spotify", etc.)
//     Domains split into chunks of 50 to stay within URL limits.
//
//  B) KEYWORD search — subject:receipt OR subject:factura OR …
//     Catches billing emails from unknown / long-tail services in EN & ES.
//
// Both searches are deduped by message ID before fetching metadata.

const TIME_FILTER = 'newer_than:18m -in:spam'

// Split known domains into chunks of 50 for separate queries
function buildDomainQueries(): string[] {
  const chunks: string[][] = []
  for (let i = 0; i < KNOWN_DOMAINS.length; i += 50) {
    chunks.push(KNOWN_DOMAINS.slice(i, i + 50))
  }
  return chunks.map(chunk =>
    `(${chunk.map(d => `from:@${d}`).join(' OR ')}) ${TIME_FILTER}`,
  )
}

// Single keyword query covering EN + ES (+ FR/DE/IT)
const KEYWORD_QUERY = (() => {
  const terms = [
    // English
    'receipt', 'invoice', 'subscription', 'renewal', 'billing',
    'charged', 'membership', 'billed', '"payment confirmation"',
    '"payment processed"', '"payment received"', '"order confirmation"',
    '"auto-renewal"', 'statement',
    // Spanish
    'factura', 'suscripción', 'renovación', 'cobro', 'cargo',
    '"confirmación de pago"', '"recibo de pago"', '"tu plan"',
    'membresía', '"pago realizado"', '"pago confirmado"',
    // French / German / Italian
    'abonnement', 'rechnung', 'abbonamento', 'reçu',
  ]
  return `(${terms.map(t => `subject:${t}`).join(' OR ')}) ${TIME_FILTER}`
})()

const DOMAIN_QUERIES = buildDomainQueries()

// ─────────────────────────────────────────────────────────────────────────────

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

/** Collect all message IDs for a single query, paginating up to `limit`. */
async function searchMessages(query: string, token: string, limit = 200): Promise<string[]> {
  const ids: string[] = []
  let pageToken: string | undefined

  while (ids.length < limit) {
    const pageSize = Math.min(limit - ids.length, 500)
    const url =
      `https://gmail.googleapis.com/gmail/v1/users/me/messages` +
      `?q=${encodeURIComponent(query)}&maxResults=${pageSize}&fields=messages(id),nextPageToken` +
      (pageToken ? `&pageToken=${pageToken}` : '')

    const page = await fetchJson<{ messages?: GmailMessageRef[]; nextPageToken?: string }>(url, token)
    const batch = (page?.messages ?? []).map(m => m.id)
    ids.push(...batch)
    pageToken = page?.nextPageToken
    if (!pageToken || batch.length === 0) break
  }
  return ids
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
    // 1. Run domain and keyword searches in parallel
    const [keywordIds, ...domainIdSets] = await Promise.all([
      searchMessages(KEYWORD_QUERY, token, 200),
      ...DOMAIN_QUERIES.map(q => searchMessages(q, token, 200)),
    ])

    // Deduplicate — domain hits take priority (already language-agnostic)
    const seen = new Set<string>()
    const messageIds: string[] = []
    for (const id of [...domainIdSets.flat(), ...keywordIds]) {
      if (!seen.has(id)) { seen.add(id); messageIds.push(id) }
    }

    if (messageIds.length === 0) {
      return NextResponse.json({ status: 'ok', candidates: [] })
    }

    // 2. Fetch metadata + snippet in batches of 50
    const metaUrl = (id: string) =>
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}` +
      `?format=minimal&fields=id,snippet,payload/headers`

    const BATCH = 50
    const rawMessages: (GmailMessage | null)[] = []
    for (let i = 0; i < Math.min(messageIds.length, 400); i += BATCH) {
      const chunk = messageIds.slice(i, i + BATCH)
      const results = await Promise.all(
        chunk.map(id => fetchJson<GmailMessage>(metaUrl(id), token).catch(() => null)),
      )
      rawMessages.push(...results)
    }

    // 3. Parse headers
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

    // 4. Detect
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
