import type { VercelRequest, VercelResponse } from '@vercel/node';
import app, { initServerless } from '../server/app.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initServerless();
  return (app as any)(req, res);
}
