import crypto from 'crypto';
import type { Request, Response, Router } from 'express';
import { env } from '../config/env.js';

/**
 * TURN credential generation using HMAC REST authentication.
 *
 * Coturn's `use-auth-secret` mode expects:
 *   username = <unix-timestamp-when-cred-expires>:<arbitrary-id>
 *   credential = HMAC-SHA1(username, shared-secret) as base64
 *
 * The backend and Coturn share the same static-auth-secret.
 */
function generateTurnCredentials() {
  const secret = env.TURN_SECRET;
  if (!secret) {
    return null;
  }

  const ttl = 86_400; // 24-hour validity
  const unixExpiry = Math.floor(Date.now() / 1000) + ttl;
  const username = `${unixExpiry}:metaverse-user`;

  const credential = crypto
    .createHmac('sha1', secret)
    .update(username)
    .digest('base64');

  return {
    urls: env.TURN_URL ? [env.TURN_URL] : [`turn:98.70.28.87:3478`],
    username,
    credential,
    ttl,
  };
}

export function registerTurnRoutes(router: Router) {
  router.get('/turn-credentials', (_req: Request, res: Response) => {
    const creds = generateTurnCredentials();
    if (!creds) {
      res.status(503).json({ error: 'TURN server not configured' });
      return;
    }
    res.json(creds);
  });
}
