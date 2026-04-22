// Gmail API client — OAuth + message search.
//
// Uses expo-auth-session Google provider for the OAuth flow.
// Requires a real Google Cloud OAuth 2.0 Client ID.
//
// Setup:
//   1. Go to console.cloud.google.com → APIs & Services → Credentials
//   2. Create OAuth 2.0 Client ID (type: "Web application")
//   3. Add authorized redirect URI: https://auth.expo.io/@carlosprnt/perezoso
//   4. Enable the Gmail API in APIs & Services → Library
//   5. Paste the client ID below

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = '';
const IOS_CLIENT_ID = '';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export function useGmailAuth() {
  const clientId = WEB_CLIENT_ID || IOS_CLIENT_ID;
  const redirectUri = AuthSession.makeRedirectUri({ preferLocalhost: false });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    clientId
      ? {
          clientId,
          scopes: [GMAIL_SCOPE],
          responseType: AuthSession.ResponseType.Token,
          redirectUri,
        }
      : { clientId: 'placeholder', scopes: [], redirectUri },
    discovery,
  );

  return {
    request: clientId ? request : null,
    response,
    promptAsync,
  };
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
