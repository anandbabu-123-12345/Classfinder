import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isUsingMongoAtlas } from '../server/config/db.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'vercel-serverless',
    database: isUsingMongoAtlas() ? 'MongoDB Atlas' : 'Local Document Store (Persistent /tmp)',
  });
}
