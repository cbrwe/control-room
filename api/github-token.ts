/**
 * Serverless proxy for GitHub's OAuth token endpoint.
 *
 * Why this exists: GitHub's token endpoint
 * (https://github.com/login/oauth/access_token) does not return CORS headers,
 * so an SPA can't POST to it directly from the browser. This Vercel function
 * receives the PKCE token exchange from our client, forwards it to GitHub,
 * and returns the JSON.
 *
 * Security: no secrets are stored here. We use PKCE so the client_id is the
 * only thing identifying the app, and the code_verifier proves the request
 * came from the same browser that started the auth flow.
 */

// Lightweight Vercel handler. Using inline types instead of @vercel/node so we
// don't have to take on the dep just for two interface aliases.
interface NodeReq {
  method?: string;
  body?: unknown;
}
interface NodeRes {
  setHeader(name: string, value: string): void;
  status(code: number): NodeRes;
  json(body: unknown): void;
  end(): void;
}

export default async function handler(req: NodeReq, res: NodeRes) {
  // Mirror CORS so the browser will accept the response.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { code, code_verifier, client_id, redirect_uri } = body ?? {};

  if (!code || !code_verifier || !client_id || !redirect_uri) {
    res.status(400).json({ error: 'missing required field' });
    return;
  }

  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id,
        code,
        code_verifier,
        redirect_uri,
      }),
    });
    const json = await r.json();
    if (!r.ok) {
      res.status(r.status).json(json);
      return;
    }
    res.status(200).json(json);
  } catch (err) {
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : 'token exchange failed' });
  }
}
