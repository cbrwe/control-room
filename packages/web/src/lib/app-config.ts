/**
 * App-level client IDs for the third-party OAuth providers we integrate with.
 *
 * Both are PUBLIC values: PKCE OAuth was designed for public SPAs so the
 * client_id alone is not a secret. The user grants tokens directly to their
 * own browser; our hardcoded ID is just "who is asking."
 *
 * Configure via Vite env vars (build-time inject):
 *   VITE_SPOTIFY_CLIENT_ID=...
 *   VITE_GITHUB_CLIENT_ID=...
 *
 * On Vercel, set these in Project Settings → Environment Variables.
 * For local dev, copy .env.example to packages/web/.env.local and fill in.
 */

const env = import.meta.env;

export const SPOTIFY_CLIENT_ID: string =
  (env.VITE_SPOTIFY_CLIENT_ID as string | undefined) ?? '';

export const GITHUB_CLIENT_ID: string =
  (env.VITE_GITHUB_CLIENT_ID as string | undefined) ?? '';

/** Whether Spotify OAuth is configured (client_id baked into the build). */
export function spotifyConfigured(): boolean {
  return SPOTIFY_CLIENT_ID.length > 0;
}

/** Whether GitHub OAuth is configured. */
export function githubConfigured(): boolean {
  return GITHUB_CLIENT_ID.length > 0;
}
