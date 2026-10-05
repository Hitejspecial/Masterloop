import express from 'express';
import { getConnectionStatus } from '../config/db.js';

const router = express.Router();

router.get('/', (req, res) => {
  const dbStatus = getConnectionStatus();
  res.json({
    status: 'ok',
    app: 'MasterLoop Backend',
    timestamp: Date.now(),
    database: {
      type: 'MongoDB',
      ...dbStatus,
    },
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    environment: process.env.NODE_ENV || 'development',
  });
});

export default router;
