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

// Trust proxy (Hostinger proxy reverso)
app.set('trust proxy', 1);

// Seguranca
app.use(helmet());

// CORS restrito - so aceita *.xrtec1.com + localhost em dev
app.use(cors({
  origin: (origin, callback) => {
    // Requests sem origin (app mobile, curl, server-to-server) passam
    if (!origin) return callback(null, true);

    // Aceita qualquer subdominio de xrtec1.com
    const isAllowed = origin.endsWith('.xrtec1.com') || origin === 'https://xrtec1.com';

    // Em dev, aceita localhost
    const isDev = process.env.NODE_ENV === 'development' && origin.includes('localhost');

    if (isAllowed || isDev) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origem bloqueada: ${origin}`);
      callback(new Error('Nao permitido pelo CORS'));
    }
  },
  credentials: true,
}));

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

// Servir frontend em producao
const frontendPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start
const PORT = Number(process.env.PORT) || 5500;

server.listen(PORT, () => {
  console.log(`[XRA AutoPay] Servidor rodando na porta ${PORT}`);
  console.log(`[XRA AutoPay] Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

export { io };
