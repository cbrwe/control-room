/**
 * Spotify OAuth via Authorization Code with PKCE.
 *
 * Why PKCE: SPAs can't store a client secret safely, and Spotify's
 * Authorization Code flow without secret is the modern recommended way.
 *
 * Setup the user does ONCE in their Spotify Developer dashboard:
 *   1. Create an app
 *   2. Set Redirect URI to the exact app URL (we use the current origin + path)
 *   3. Paste the Client ID into this widget's settings
 *
 * Tokens live in localStorage. Access token refresh happens automatically
 * when fetchData detects a 401.
 */

import { loadConfig, saveConfig, clearConfig } from '../widget-config';

const PKCE_VERIFIER_KEY = 'cr.spotify.pkce_verifier';
const TOKEN_CONFIG_ID = 'spotify_tokens';
const APP_CONFIG_ID = 'spotify_app';

const SCOPES = ['user-read-currently-playing', 'user-read-playback-state'];

interface SpotifyAppConfig {
  clientId: string;
}

interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

function generateVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/** Current redirect URI = the app's root, no query / hash. */
export function getRedirectUri(): string {
  const u = new URL(window.location.href);
  u.search = '';
  u.hash = '';
  return u.toString();
}

export function getClientId(): string | undefined {
  return loadConfig<SpotifyAppConfig>(APP_CONFIG_ID)?.clientId;
}

export function setClientId(clientId: string): void {
  saveConfig<SpotifyAppConfig>(APP_CONFIG_ID, { clientId: clientId.trim() });
}

export function getTokens(): SpotifyTokens | null {
  return loadConfig<SpotifyTokens>(TOKEN_CONFIG_ID);
}

export function clearTokens(): void {
  clearConfig(TOKEN_CONFIG_ID);
}

export function isConnected(): boolean {
  return !!getTokens()?.accessToken;
}

/** Kick off the OAuth flow by redirecting to Spotify. */
export async function startAuth(): Promise<void> {
  const clientId = getClientId();
  if (!clientId) throw new Error('Spotify Client ID is not set in widget settings.');
  const verifier = generateVerifier();
  localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  const challenge = base64UrlEncode(await sha256(verifier));
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES.join(' '),
    redirect_uri: getRedirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
}

/**
 * If the URL has a ?code= from Spotify, exchange it for tokens. Returns true
 * if exchange happened. Clears the code from the URL on success.
 */
export async function handleAuthCallback(): Promise<boolean> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  if (!code) return false;
  const clientId = getClientId();
  const verifier = localStorage.getItem(PKCE_VERIFIER_KEY);
  if (!clientId || !verifier) {
    // Clean stale code from URL anyway.
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, '', url.toString());
    return false;
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    client_id: clientId,
    code_verifier: verifier,
  });

  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  // Clean code from URL no matter what.
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, '', url.toString());
  localStorage.removeItem(PKCE_VERIFIER_KEY);

  if (!r.ok) throw new Error(`Spotify token exchange failed: ${r.status}`);
  const j = (await r.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  saveConfig<SpotifyTokens>(TOKEN_CONFIG_ID, {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expiresAt: Date.now() + j.expires_in * 1000,
  });
  return true;
}

async function refreshTokens(): Promise<SpotifyTokens> {
  const tokens = getTokens();
  const clientId = getClientId();
  if (!tokens || !clientId) throw new Error('No tokens to refresh');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
    client_id: clientId,
  });
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) {
    clearTokens();
    throw new Error('Spotify refresh failed — please reconnect');
  }
  const j = (await r.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  const updated: SpotifyTokens = {
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? tokens.refreshToken,
    expiresAt: Date.now() + j.expires_in * 1000,
  };
  saveConfig<SpotifyTokens>(TOKEN_CONFIG_ID, updated);
  return updated;
}

/** GET a Spotify API path with auto-refresh on 401. Returns parsed JSON or null on 204. */
export async function spotifyFetch<T = unknown>(path: string): Promise<T | null> {
  let tokens = getTokens();
  if (!tokens) throw new Error('NOT CONNECTED');
  if (tokens.expiresAt < Date.now() + 30 * 1000) {
    tokens = await refreshTokens();
  }
  const doFetch = (accessToken: string) =>
    fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  let r = await doFetch(tokens.accessToken);
  if (r.status === 401) {
    tokens = await refreshTokens();
    r = await doFetch(tokens.accessToken);
  }
  if (r.status === 204) return null;
  if (!r.ok) throw new Error(`SPOTIFY ${r.status}`);
  return (await r.json()) as T;
}
