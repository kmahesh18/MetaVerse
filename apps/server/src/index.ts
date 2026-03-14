import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import type { Application } from 'express';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { corsOptions } from './config/cors.js';
import routes from './routes/index.js';
import { setupSocketIO } from './socket/index.js';
import { setRealtimeIO } from './socket/realtime.js';
import type { ClientToServerEvents, ServerToClientEvents } from '@metaverse/shared';

const app: Application = express();
const httpServer = createServer(app);

// ── Socket.io ──
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

// ── Middleware ──
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

const isProduction = env.NODE_ENV === 'production';

// Keep production protection in place, but allow local multi-user development
// and browser automation without tripping a global IP-based limit.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Health check ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ──
app.use('/api', routes);

// ── Socket.io Setup ──
setRealtimeIO(io);
setupSocketIO(io);

// ── Start ──
async function start(): Promise<void> {
  await connectDB();
  httpServer.listen(env.PORT, () => {
    console.log(`[Server] Running on port ${env.PORT}`);
    console.log(`[Server] Health: http://localhost:${env.PORT}/health`);
  });
}

start().catch(console.error);

export { app, httpServer, io };
