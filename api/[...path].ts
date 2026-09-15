import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import router from '../artifacts/api-server/src/routes';

// Minimal Express app — API routes only, NO static file serving
// Vercel handles static files separately from outputDirectory
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', router);

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any, () => {
    res.status(404).json({ error: 'API route not found' });
  });
}
