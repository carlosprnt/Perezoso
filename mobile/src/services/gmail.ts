// Gmail API client — OAuth + message search.
//
// Uses expo-auth-session for the Google OAuth implicit grant flow
// (responseType: "token") so the access token comes back directly
// without a backend token exchange.
//
// The token is short-lived (~1 hour) which is fine — we only need it
// for a single search session.

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// ── Google OAuth config ─────────────────────────────────────────────
// Web client ID from Google Cloud Console. The Expo auth proxy handles
// the redirect so a "Web application" type client ID works on all
// platforms.
//
// Replace with your real client ID from:
//   console.cloud.google.com → APIs & Services → Credentials
const GOOGLE_CLIENT_ID =
  '7ed0ce73-b35a-49c7-90c7-8737f808e530.apps.googleusercontent.com';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export function useGmailAuth() {
  const redirectUri = AuthSession.makeRedirectUri({ preferLocalhost: false });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: [GMAIL_SCOPE],
      responseType: AuthSession.ResponseType.Token,
      redirectUri,
    },
    discovery,
  );

  return { request, response, promptAsync };
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
