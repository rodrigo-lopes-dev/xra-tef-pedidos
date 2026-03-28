import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { Server as SocketIOServer } from 'socket.io';
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { rateLimiter } from './middleware/rateLimiter';
import { publicRoutes } from './routes/publicRoutes';
import { authRoutes } from './routes/authRoutes';
import { adminRoutes } from './routes/adminRoutes';

const app = express();
const server = http.createServer(app);

// Socket.IO com isolamento por tenant
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Socket.IO: cada conexao entra na sala do seu tenant
io.on('connection', (socket) => {
  const tenantId = socket.handshake.query.tenantId as string;

  if (!tenantId) {
    socket.disconnect();
    return;
  }

  socket.join(`tenant:${tenantId}`);

  socket.on('disconnect', () => {
    // cleanup automatico pelo Socket.IO
  });
});

// Disponibilizar io para as rotas emitirem eventos
app.set('io', io);

// Seguranca
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Rate limiting global
app.use(rateLimiter);

// Resolver tenant pelo subdominio em TODAS as rotas /api
app.use('/api', tenantMiddleware);

// Rotas publicas (sem auth) — cardapio, config tenant, criar pedido
app.use('/api', publicRoutes);

// Rotas de autenticacao
app.use('/api/auth', authRoutes);

// Rotas admin (protegidas por JWT)
app.use('/api/admin', adminRoutes);

// Health check (sem tenant middleware)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start
const PORT = Number(process.env.PORT) || 2930;

server.listen(PORT, () => {
  console.log(`[XRA AutoPay] Servidor rodando na porta ${PORT}`);
  console.log(`[XRA AutoPay] Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

export { io };
