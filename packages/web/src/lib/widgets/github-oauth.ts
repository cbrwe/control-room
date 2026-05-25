/**
 * GitHub OAuth via Authorization Code + PKCE.
 *
 * GitHub supports PKCE for OAuth Apps (no client secret needed). The token
 * exchange itself can't be browser-direct because GitHub doesn't send CORS
 * headers — we proxy through the Vercel serverless function at /api/github-token.
 *
 * Tokens live in localStorage. The app's client_id is baked at build time
 * from VITE_GITHUB_CLIENT_ID.
 */

import { loadConfig, saveConfig, clearConfig } from '../widget-config';
import { GITHUB_CLIENT_ID } from '../app-config';

const PKCE_VERIFIER_KEY = 'cr.github.pkce_verifier';
const TOKEN_CONFIG_ID = 'github_tokens';
const STATE_VALUE = 'cr-github';

const SCOPES = ['notifications'];

interface GithubTokens {
  accessToken: string;
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

export function getTokens(): GithubTokens | null {
  return loadConfig<GithubTokens>(TOKEN_CONFIG_ID);
}

export function clearTokens(): void {
  clearConfig(TOKEN_CONFIG_ID);
}

export function isConnected(): boolean {
  return !!getTokens()?.accessToken;
}

export async function startAuth(): Promise<void> {
  if (!GITHUB_CLIENT_ID) {
    throw new Error('GitHub OAuth not configured (VITE_GITHUB_CLIENT_ID missing).');
  }
  const verifier = generateVerifier();
  localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  const challenge = base64UrlEncode(await sha256(verifier));
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    scope: SCOPES.join(' '),
    state: STATE_VALUE,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  window.location.assign(`https://github.com/login/oauth/authorize?${params.toString()}`);
}

/**
 * Handle the redirect back from GitHub. Returns true if a code was exchanged
 * for a token, false if there's no code or it's not ours.
 */
export async function handleAuthCallback(): Promise<boolean> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code) return false;
  // Spotify also redirects with ?code — only handle ours if the state matches.
  if (state !== STATE_VALUE) return false;
  const verifier = localStorage.getItem(PKCE_VERIFIER_KEY);
  // Clean URL no matter what so we don't reprocess on next mount.
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, '', url.toString());
  localStorage.removeItem(PKCE_VERIFIER_KEY);
  if (!verifier) return false;

  const r = await fetch('/api/github-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      code_verifier: verifier,
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: getRedirectUri(),
    }),
  });
  if (!r.ok) throw new Error(`GitHub token exchange failed: ${r.status}`);
  const j = (await r.json()) as { access_token?: string; error?: string };
  if (j.error || !j.access_token) {
    throw new Error(j.error ?? 'no token returned');
  }
  saveConfig<GithubTokens>(TOKEN_CONFIG_ID, { accessToken: j.access_token });
  return true;
}

export async function githubFetch<T = unknown>(path: string): Promise<T> {
  const tokens = getTokens();
  if (!tokens) throw new Error('NOT CONNECTED');
  const r = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (r.status === 401) {
    clearTokens();
    throw new Error('AUTH EXPIRED — RECONNECT');
  }
  if (!r.ok) throw new Error(`GITHUB ${r.status}`);
  return (await r.json()) as T;
}
