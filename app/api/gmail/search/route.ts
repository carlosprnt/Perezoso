import { NextRequest, NextResponse } from 'next/server'
import { detectSubscriptionsFromEmails, type GmailMessageHeader } from '@/lib/subscription-detection'

const GMAIL_SEARCH_QUERY = [
  'subject:receipt OR subject:invoice OR subject:subscription',
  'OR subject:renewal OR subject:billing OR subject:charged',
  'OR subject:membership OR subject:billed OR subject:"payment confirmation"',
  'OR subject:"your plan" OR subject:"payment processed"',
  'newer_than:12m -in:spam',
].join(' ')

interface GmailMessageRef { id: string }
interface GmailHeader { name: string; value: string }
interface GmailMessage {
  id: string
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
  const token = request.cookies.get('gmail_token')?.value

  // ── Mock mode ───────────────────────────────────────────────────────────────
  // Active when GMAIL_MOCK=true OR when no token exists in development.
  // This lets you test the full import UI without a real Google account.
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
    // 1. Search Gmail for subscription-related messages
    const searchUrl =
      `https://gmail.googleapis.com/gmail/v1/users/me/messages` +
      `?q=${encodeURIComponent(GMAIL_SEARCH_QUERY)}&maxResults=60&fields=messages(id),nextPageToken`

    const searchData = await fetchJson<{ messages?: GmailMessageRef[] }>(searchUrl, token)
    const messageIds = (searchData?.messages ?? []).map(m => m.id)

    if (messageIds.length === 0) {
      return NextResponse.json({ status: 'ok', candidates: [] })
    }

    // 2. Fetch message metadata (From, Subject, Date) in parallel — limit to 40
    const idsToFetch = messageIds.slice(0, 40)
    const metaUrl = (id: string) =>
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}` +
      `?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date` +
      `&fields=id,payload/headers`

    const rawMessages = await Promise.all(
      idsToFetch.map(id => fetchJson<GmailMessage>(metaUrl(id), token).catch(() => null)),
    )

    // 3. Parse headers into flat objects
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
        }
      })
      .filter(h => h.from && h.subject)

    // 4. Run detection heuristics
    const candidates = detectSubscriptionsFromEmails(headers)

    return NextResponse.json({ status: 'ok', candidates })
  } catch (err) {
    const isExpired = err instanceof Error && err.message === 'token_expired'

    if (isExpired) {
      // Clear the stale cookie
      const res = NextResponse.json({ status: 'not_connected', candidates: [] })
      res.cookies.set('gmail_token', '', { maxAge: 0, path: '/' })
      return res
    }

    console.error('[gmail/search]', err)
    return NextResponse.json({ status: 'error', candidates: [], error: 'Search failed' })
  }
}
