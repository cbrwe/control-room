/**
 * Spotify OAuth via Authorization Code with PKCE.
 *
 * The Spotify app is registered ONCE (by the CONTROL ROOM project) and its
 * client_id is baked into the build via VITE_SPOTIFY_CLIENT_ID. Users only
 * have to click Connect and authorize on Spotify's site.
 *
 * PKCE is browser-only — no client secret is ever sent, the code_verifier
 * proves the token exchange came from the same browser that started auth.
 */

import { loadConfig, saveConfig, clearConfig } from '../widget-config';
import { SPOTIFY_CLIENT_ID } from '../app-config';

const PKCE_VERIFIER_KEY = 'cr.spotify.pkce_verifier';
const TOKEN_CONFIG_ID = 'spotify_tokens';
const STATE_VALUE = 'cr-spotify';

const SCOPES = ['user-read-currently-playing', 'user-read-playback-state'];

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

export function getRedirectUri(): string {
  const u = new URL(window.location.href);
  u.search = '';
  u.hash = '';
  return u.toString();
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

export async function startAuth(): Promise<void> {
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error('Spotify OAuth not configured (VITE_SPOTIFY_CLIENT_ID missing).');
  }
  const verifier = generateVerifier();
  localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  const challenge = base64UrlEncode(await sha256(verifier));
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SCOPES.join(' '),
    redirect_uri: getRedirectUri(),
    state: STATE_VALUE,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
}

export async function handleAuthCallback(): Promise<boolean> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code) return false;
  if (state !== STATE_VALUE) return false;
  const verifier = localStorage.getItem(PKCE_VERIFIER_KEY);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, '', url.toString());
  localStorage.removeItem(PKCE_VERIFIER_KEY);
  if (!verifier) return false;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: verifier,
  });
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
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
  if (!tokens) throw new Error('No tokens to refresh');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
    client_id: SPOTIFY_CLIENT_ID,
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
