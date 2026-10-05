import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import testRoutes from './routes/testRoutes.js';
import taxonomyRoutes from './routes/taxonomyRoutes.js';
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

// Resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (look in backend/.env then fallback to root .env)
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

// const PORT = Number(process.env.BACKEND_PORT) || 5000;
const PORT = Number(process.env.PORT) || 5000;
const app = express();

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Dynamic origin matching to support credentials with cookies across localhost and preview hosts
    callback(null, true);
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/taxonomy', taxonomyRoutes);

// Root fallback route
app.get('/api', (req, res) => {
  res.json({
    name: 'MasterLoop Core API',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Initialize database connection
connectDB().catch((err) => {
  console.warn('[Backend] Non-fatal DB initialization warning:', err.message);
});

// Only listen if executed directly as standalone process
const isMain = process.argv[1] && (
  process.argv[1].endsWith('server.js') || 
  process.argv[1].endsWith('backend/server.js')
);

if (isMain) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MasterLoop Backend] Express server running on http://0.0.0.0:${PORT}`);
  });
}

export { app };
export default app;
