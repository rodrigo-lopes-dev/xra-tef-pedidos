import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Payload do JWT
export interface JwtPayload {
  userId: string;
  tenantId: string;
  tipo: 'admin' | 'vendedor';
}

// Estender o tipo Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Variavel JWT_SECRET e obrigatoria. Verifique o .env');
}

/**
 * Middleware de autenticacao JWT.
 * Valida o token e garante que o usuario pertence ao tenant da requisicao.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token nao fornecido' });
      return;
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET!) as JwtPayload;

    // Seguranca: garantir que o token pertence ao mesmo tenant da requisicao
    // Isso impede um admin do tenant A acessar dados do tenant B
    if (decoded.tenantId !== req.tenant.id) {
      res.status(403).json({ error: 'Acesso negado: token nao pertence a este estabelecimento' });
      return;
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expirado. Faca login novamente' });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Token invalido' });
      return;
    }
    console.error('[AuthMiddleware] Erro:', err);
    res.status(500).json({ error: 'Erro interno de autenticacao' });
  }
}

/**
 * Middleware que restringe acesso apenas para admins.
 * Deve ser usado DEPOIS do authMiddleware.
 */
export function adminOnly(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.tipo !== 'admin') {
    res.status(403).json({ error: 'Acesso restrito a administradores' });
    return;
  }
  next();
}
