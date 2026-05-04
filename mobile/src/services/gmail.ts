// Gmail API client — OAuth + message search.
//
// Uses expo-auth-session imperatively (no hooks, no module-level side
// effects) so it doesn't interfere with the main Supabase auth flow.
// The auth session is only created when the user explicitly taps
// "Conectar y buscar suscripciones".

import * as AuthSession from 'expo-auth-session';

// ── Google OAuth config ─────────────────────────────────────────────
// Web client ID from Google Cloud Console (type: "Web application").
// Add redirect URI: https://auth.expo.io/@carlosprnt/perezoso
const WEB_CLIENT_ID = '';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export async function promptGmailAuth(): Promise<string | null> {
  if (!WEB_CLIENT_ID) return null;

  const redirectUri = AuthSession.makeRedirectUri({ preferLocalhost: false });
  const request = new AuthSession.AuthRequest({
    clientId: WEB_CLIENT_ID,
    scopes: [GMAIL_SCOPE],
    responseType: AuthSession.ResponseType.Token,
    redirectUri,
  });

  const result = await request.promptAsync(discovery);

  if (result.type === 'success' && result.authentication?.accessToken) {
    return result.authentication.accessToken;
  }
  return null;
}

// ── Gmail API types ─────────────────────────────────────────────────
export interface GmailMessageHeader {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet?: string;
}

interface GmailListResponse {
  messages?: { id: string; threadId: string }[];
  resultSizeEstimate?: number;
}

interface GmailMessageResponse {
  id: string;
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
  };
}

// ── Search subscription emails ──────────────────────────────────────
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

const SEARCH_QUERY = [
  'newer_than:12m',
  '(subject:subscription OR subject:suscripción OR subject:suscripcion',
  'OR subject:receipt OR subject:recibo OR subject:invoice OR subject:factura',
  'OR subject:billing OR subject:cobro OR subject:payment OR subject:pago',
  'OR subject:renewal OR subject:renovación OR subject:renovacion',
  'OR subject:membership OR subject:membresía',
  'OR from:noreply OR from:no-reply OR from:billing OR from:invoice)',
].join(' ');

async function fetchWithAuth(url: string, token: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Gmail API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function searchSubscriptionEmails(
  accessToken: string,
): Promise<GmailMessageHeader[]> {
  const listUrl = `${GMAIL_API}/messages?q=${encodeURIComponent(SEARCH_QUERY)}&maxResults=150`;
  const listData: GmailListResponse = await fetchWithAuth(listUrl, accessToken);

  if (!listData.messages?.length) return [];

  const messageIds = listData.messages.slice(0, 100);

  const headers: GmailMessageHeader[] = [];
  const batchSize = 20;

  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(({ id }) =>
        fetchWithAuth(
          `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          accessToken,
        ).catch(() => null),
      ),
    );

    for (const msg of results) {
      if (!msg) continue;
      const m = msg as GmailMessageResponse;
      const getHeader = (name: string) =>
        m.payload.headers.find(
          (h) => h.name.toLowerCase() === name.toLowerCase(),
        )?.value ?? '';

      headers.push({
        id: m.id,
        from: getHeader('From'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        snippet: m.snippet,
      });
    }
  }

  return headers;
}
