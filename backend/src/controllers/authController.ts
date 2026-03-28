import { Request, Response } from 'express';
import { login, verificarToken } from '../services/authService';

/**
 * POST /api/auth/login
 * Body: { usuario, senha }
 */
export async function loginController(req: Request, res: Response): Promise<void> {
  try {
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
      res.status(400).json({ error: 'Usuario e senha sao obrigatorios' });
      return;
    }

    const result = await login(req.tenant.id, usuario, senha);
    res.json(result);
  } catch (err: any) {
    // Mensagens de erro controladas do authService
    res.status(401).json({ error: err.message || 'Erro ao fazer login' });
  }
}

/**
 * GET /api/auth/verify
 * Header: Authorization: Bearer <token>
 * Verifica se o token ainda e valido
 */
export async function verifyController(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token nao fornecido' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verificarToken(token);

    // Garantir que o token pertence ao tenant da requisicao
    if (payload.tenantId !== req.tenant.id) {
      res.status(403).json({ error: 'Token nao pertence a este estabelecimento' });
      return;
    }

    res.json({ valid: true, user: payload });
  } catch {
    res.status(401).json({ valid: false, error: 'Token invalido ou expirado' });
  }
}
