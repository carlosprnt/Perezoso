// Central platform catalog — 80+ popular subscription services
// Maps service names to domains for logo resolution.
//
// Logo source: Google Favicons API (returns PNG at requested size)
// URL pattern: https://www.google.com/s2/favicons?domain={domain}&sz=128
//
// This replaces Simple Icons CDN (returns SVGs — incompatible with RN Image)
// and Clearbit (deprecated, returns 403).

export interface Platform {
  id: string;
  name: string;
  domain: string;
  category: string;
  brandColor?: string;
  aliases?: string[];
}

export const FAVICON_BASE = 'https://www.google.com/s2/favicons';
export const FAVICON_SIZE = 128;

export function logoUrlFromDomain(domain: string): string {
  return `${FAVICON_BASE}?domain=${domain}&sz=${FAVICON_SIZE}`;
}

export const PLATFORMS: Platform[] = [
  // ─── Streaming ──────────────────────────────────────────
  { id: 'netflix', name: 'Netflix', domain: 'netflix.com', category: 'streaming', brandColor: '#E50914' },
  { id: 'youtube-premium', name: 'YouTube Premium', domain: 'youtube.com', category: 'streaming', brandColor: '#FF0000', aliases: ['youtube', 'yt premium'] },
  { id: 'disney-plus', name: 'Disney+', domain: 'disneyplus.com', category: 'streaming', brandColor: '#113CCF', aliases: ['disney+', 'disneyplus', 'disney plus'] },
  { id: 'apple-tv', name: 'Apple TV+', domain: 'tv.apple.com', category: 'streaming', aliases: ['apple tv', 'appletv+'] },
  { id: 'prime-video', name: 'Prime Video', domain: 'primevideo.com', category: 'streaming', brandColor: '#00A8E1', aliases: ['amazon prime video'] },
  { id: 'hbo-max', name: 'HBO Max', domain: 'max.com', category: 'streaming', brandColor: '#5822B4', aliases: ['hbo', 'max'] },
  { id: 'hulu', name: 'Hulu', domain: 'hulu.com', category: 'streaming', brandColor: '#1CE783' },
  { id: 'paramount-plus', name: 'Paramount+', domain: 'paramountplus.com', category: 'streaming', aliases: ['paramount+', 'paramount plus'] },
  { id: 'crunchyroll', name: 'Crunchyroll', domain: 'crunchyroll.com', category: 'streaming', brandColor: '#F47521' },
  { id: 'twitch', name: 'Twitch', domain: 'twitch.tv', category: 'streaming', brandColor: '#9146FF', aliases: ['twitch turbo'] },
  { id: 'dazn', name: 'DAZN', domain: 'dazn.com', category: 'streaming' },
  { id: 'mubi', name: 'MUBI', domain: 'mubi.com', category: 'streaming' },

  // ─── Music ──────────────────────────────────────────────
  { id: 'spotify', name: 'Spotify', domain: 'spotify.com', category: 'music', brandColor: '#1DB954' },
  { id: 'apple-music', name: 'Apple Music', domain: 'music.apple.com', category: 'music' },
  { id: 'tidal', name: 'Tidal', domain: 'tidal.com', category: 'music' },
  { id: 'deezer', name: 'Deezer', domain: 'deezer.com', category: 'music', brandColor: '#A238FF' },
  { id: 'soundcloud', name: 'SoundCloud', domain: 'soundcloud.com', category: 'music', brandColor: '#FF5500' },
  { id: 'audible', name: 'Audible', domain: 'audible.com', category: 'music', brandColor: '#F8991D' },

  // ─── Productivity ───────────────────────────────────────
  { id: 'notion', name: 'Notion', domain: 'notion.so', category: 'productivity' },
  { id: 'figma', name: 'Figma', domain: 'figma.com', category: 'productivity', brandColor: '#F24E1E' },
  { id: 'slack', name: 'Slack', domain: 'slack.com', category: 'productivity', brandColor: '#4A154B' },
  { id: 'adobe', name: 'Adobe Creative Cloud', domain: 'adobe.com', category: 'productivity', brandColor: '#DA1F26', aliases: ['adobe cc', 'photoshop', 'illustrator', 'premiere', 'lightroom'] },
  { id: 'canva', name: 'Canva', domain: 'canva.com', category: 'productivity', brandColor: '#00C4CC' },
  { id: 'evernote', name: 'Evernote', domain: 'evernote.com', category: 'productivity', brandColor: '#00A82D' },
  { id: 'todoist', name: 'Todoist', domain: 'todoist.com', category: 'productivity', brandColor: '#E44332' },
  { id: 'linear', name: 'Linear', domain: 'linear.app', category: 'productivity' },
  { id: 'miro', name: 'Miro', domain: 'miro.com', category: 'productivity', brandColor: '#FFD02F' },
  { id: 'asana', name: 'Asana', domain: 'asana.com', category: 'productivity' },
  { id: 'trello', name: 'Trello', domain: 'trello.com', category: 'productivity', brandColor: '#0052CC' },
  { id: 'dropbox', name: 'Dropbox', domain: 'dropbox.com', category: 'productivity', brandColor: '#0061FF' },
  { id: 'grammarly', name: 'Grammarly', domain: 'grammarly.com', category: 'productivity' },
  { id: 'zoom', name: 'Zoom', domain: 'zoom.us', category: 'productivity', brandColor: '#2D8CFF' },
  { id: 'microsoft-365', name: 'Microsoft 365', domain: 'microsoft.com', category: 'productivity', aliases: ['office 365', 'ms 365'] },
  { id: 'google-workspace', name: 'Google Workspace', domain: 'workspace.google.com', category: 'productivity', aliases: ['g suite'] },
  { id: 'clickup', name: 'ClickUp', domain: 'clickup.com', category: 'productivity' },
  { id: 'monday', name: 'Monday.com', domain: 'monday.com', category: 'productivity', aliases: ['monday'] },
  { id: 'loom', name: 'Loom', domain: 'loom.com', category: 'productivity' },

  // ─── Cloud & Storage ────────────────────────────────────
  { id: 'github', name: 'GitHub', domain: 'github.com', category: 'cloud', aliases: ['github pro'] },
  { id: 'icloud', name: 'iCloud+', domain: 'icloud.com', category: 'cloud', aliases: ['icloud', 'icloud+'] },
  { id: 'google-one', name: 'Google One', domain: 'one.google.com', category: 'cloud' },
  { id: 'onedrive', name: 'OneDrive', domain: 'onedrive.live.com', category: 'cloud', brandColor: '#0078D4', aliases: ['microsoft onedrive'] },
  { id: 'aws', name: 'AWS', domain: 'aws.amazon.com', category: 'cloud', brandColor: '#232F3E', aliases: ['amazon web services'] },
  { id: 'digitalocean', name: 'DigitalOcean', domain: 'digitalocean.com', category: 'cloud', brandColor: '#0080FF' },
  { id: 'vercel', name: 'Vercel', domain: 'vercel.com', category: 'cloud' },
  { id: 'netlify', name: 'Netlify', domain: 'netlify.com', category: 'cloud', brandColor: '#00C7B7' },
  { id: 'heroku', name: 'Heroku', domain: 'heroku.com', category: 'cloud', brandColor: '#430098' },
  { id: 'cloudflare', name: 'Cloudflare', domain: 'cloudflare.com', category: 'cloud', brandColor: '#F38020' },
  { id: 'supabase', name: 'Supabase', domain: 'supabase.com', category: 'cloud', brandColor: '#3ECF8E' },
  { id: 'railway', name: 'Railway', domain: 'railway.app', category: 'cloud' },

  // ─── AI ─────────────────────────────────────────────────
  { id: 'chatgpt', name: 'ChatGPT Plus', domain: 'openai.com', category: 'ai', brandColor: '#412991', aliases: ['openai', 'chatgpt', 'gpt plus', 'chatgpt plus'] },
  { id: 'claude', name: 'Claude Pro', domain: 'anthropic.com', category: 'ai', aliases: ['anthropic', 'claude', 'claude pro'] },
  { id: 'midjourney', name: 'Midjourney', domain: 'midjourney.com', category: 'ai' },
  { id: 'copilot', name: 'GitHub Copilot', domain: 'github.com', category: 'ai', aliases: ['copilot'] },
  { id: 'perplexity', name: 'Perplexity', domain: 'perplexity.ai', category: 'ai' },
  { id: 'jasper', name: 'Jasper', domain: 'jasper.ai', category: 'ai' },
  { id: 'runway', name: 'Runway', domain: 'runwayml.com', category: 'ai' },
  { id: 'cursor', name: 'Cursor', domain: 'cursor.com', category: 'ai' },
  { id: 'replit', name: 'Replit', domain: 'replit.com', category: 'ai' },
  { id: 'eleven-labs', name: 'ElevenLabs', domain: 'elevenlabs.io', category: 'ai' },

  // ─── Gaming ─────────────────────────────────────────────
  { id: 'playstation-plus', name: 'PlayStation Plus', domain: 'playstation.com', category: 'gaming', brandColor: '#003087', aliases: ['ps plus', 'ps+'] },
  { id: 'xbox-gamepass', name: 'Xbox Game Pass', domain: 'xbox.com', category: 'gaming', brandColor: '#107C10', aliases: ['game pass', 'gamepass'] },
  { id: 'nintendo-switch', name: 'Nintendo Switch Online', domain: 'nintendo.com', category: 'gaming', brandColor: '#E4000F' },
  { id: 'ea-play', name: 'EA Play', domain: 'ea.com', category: 'gaming' },
  { id: 'geforce-now', name: 'GeForce Now', domain: 'nvidia.com', category: 'gaming', brandColor: '#76B900' },

  // ─── Education ──────────────────────────────────────────
  { id: 'coursera', name: 'Coursera', domain: 'coursera.org', category: 'education', brandColor: '#0056D2' },
  { id: 'duolingo', name: 'Duolingo', domain: 'duolingo.com', category: 'education', brandColor: '#58CC02' },
  { id: 'skillshare', name: 'Skillshare', domain: 'skillshare.com', category: 'education', brandColor: '#00FF84' },
  { id: 'masterclass', name: 'MasterClass', domain: 'masterclass.com', category: 'education' },
  { id: 'medium', name: 'Medium', domain: 'medium.com', category: 'education' },
  { id: 'blinkist', name: 'Blinkist', domain: 'blinkist.com', category: 'education' },
  { id: 'headspace', name: 'Headspace', domain: 'headspace.com', category: 'education' },
  { id: 'calm', name: 'Calm', domain: 'calm.com', category: 'education' },

  // ─── Finance ────────────────────────────────────────────
  { id: 'revolut', name: 'Revolut', domain: 'revolut.com', category: 'other' },
  { id: 'wise', name: 'Wise', domain: 'wise.com', category: 'other', brandColor: '#9FE870' },
  { id: 'amazon-prime', name: 'Amazon Prime', domain: 'amazon.com', category: 'other', brandColor: '#FF9900', aliases: ['amazon'] },
  { id: 'paypal', name: 'PayPal', domain: 'paypal.com', category: 'other', brandColor: '#003087' },

  // ─── VPN & Security ─────────────────────────────────────
  { id: 'nordvpn', name: 'NordVPN', domain: 'nordvpn.com', category: 'other', brandColor: '#4687FF' },
  { id: 'expressvpn', name: 'ExpressVPN', domain: 'expressvpn.com', category: 'other' },
  { id: '1password', name: '1Password', domain: '1password.com', category: 'other', brandColor: '#0094F5' },
  { id: 'bitwarden', name: 'Bitwarden', domain: 'bitwarden.com', category: 'other' },
  { id: 'lastpass', name: 'LastPass', domain: 'lastpass.com', category: 'other', brandColor: '#D32D27' },
  { id: 'protonvpn', name: 'Proton VPN', domain: 'protonvpn.com', category: 'other', aliases: ['proton'] },
  { id: 'surfshark', name: 'Surfshark', domain: 'surfshark.com', category: 'other' },

  // ─── Fitness & Health ───────────────────────────────────
  { id: 'strava', name: 'Strava', domain: 'strava.com', category: 'other', brandColor: '#FC4C02' },
  { id: 'peloton', name: 'Peloton', domain: 'onepeloton.com', category: 'other' },
  { id: 'fitbit', name: 'Fitbit Premium', domain: 'fitbit.com', category: 'other' },
  { id: 'apple-fitness', name: 'Apple Fitness+', domain: 'apple.com', category: 'other', aliases: ['fitness+'] },

  // ─── Communication ──────────────────────────────────────
  { id: 'telegram', name: 'Telegram Premium', domain: 'telegram.org', category: 'other', brandColor: '#0088CC' },
  { id: 'discord', name: 'Discord Nitro', domain: 'discord.com', category: 'other', brandColor: '#5865F2', aliases: ['discord', 'nitro'] },
];

// ─── Lookup helpers ─────────────────────────────────────────────────

const _nameIndex = new Map<string, Platform>();
const _idIndex = new Map<string, Platform>();

function _buildIndex() {
  if (_nameIndex.size > 0) return;
  for (const p of PLATFORMS) {
    _idIndex.set(p.id, p);
    _nameIndex.set(p.name.toLowerCase(), p);
    if (p.aliases) {
      for (const a of p.aliases) {
        _nameIndex.set(a.toLowerCase(), p);
      }
    }
  }
}

/** Find a platform by name, id, or alias (case-insensitive) */
export function findPlatform(query: string): Platform | undefined {
  _buildIndex();
  const q = query.toLowerCase().trim();
  return _idIndex.get(q) ?? _nameIndex.get(q);
}

/**
 * Resolve the best logo URL for a subscription.
 * Priority: explicit logoUrl > platform catalog match > null (initials fallback)
 */
export function resolvePlatformLogoUrl(
  name: string,
  logoUrl?: string | null,
  simpleIconSlug?: string | null,
): string | null {
  if (logoUrl) return logoUrl;
  const platform = findPlatform(name) ?? (simpleIconSlug ? findPlatform(simpleIconSlug) : undefined);
  if (platform) return logoUrlFromDomain(platform.domain);
  return null;
}

/** Get logo URLs for a list of platform names (for confetti, LogoStack, etc.) */
export function getLogoUrlsForNames(names: string[]): string[] {
  return names
    .map((n) => resolvePlatformLogoUrl(n))
    .filter((url): url is string => url !== null);
}
