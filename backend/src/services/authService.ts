import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { JwtPayload } from '../middleware/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_EXPIRATION = '24h';
const BCRYPT_ROUNDS = 10;

interface LoginResult {
  token: string;
  user: {
    id: string;
    nome: string;
    tipo: string;
  };
}

/**
 * Autentica usuario e retorna JWT.
 * Busca usuario APENAS dentro do tenant da requisicao.
 */
export async function login(
  tenantId: string,
  usuario: string,
  senha: string
): Promise<LoginResult> {
  // 1. Buscar usuario pelo tenant + nome de usuario
  const { data: user, error } = await supabase
    .from('ap_usuarios')
    .select('id, tenant_id, nome, usuario, senha_hash, tipo, ativo')
    .eq('tenant_id', tenantId)
    .eq('usuario', usuario)
    .single();

  if (error || !user) {
    throw new Error('Usuario ou senha incorretos');
  }

  // 2. Verificar se usuario esta ativo
  if (!user.ativo) {
    throw new Error('Usuario desativado. Contate o administrador');
  }

  // 3. Comparar senha com hash bcrypt
  const senhaValida = await bcrypt.compare(senha, user.senha_hash);
  if (!senhaValida) {
    throw new Error('Usuario ou senha incorretos');
  }

  // 4. Gerar JWT
  const payload: JwtPayload = {
    userId: user.id,
    tenantId: user.tenant_id,
    tipo: user.tipo,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION,
  });

  return {
    token,
    user: {
      id: user.id,
      nome: user.nome,
      tipo: user.tipo,
    },
  };
}

/**
 * Gera hash bcrypt para senha.
 * Usado ao criar/atualizar usuarios.
 */
export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, BCRYPT_ROUNDS);
}

/**
 * Verifica se um token JWT e valido e retorna o payload.
 */
export function verificarToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
