import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

// Tipo do tenant anexado ao request
export interface Tenant {
  id: string;
  slug: string;
  nome: string;
  logo_url: string | null;
  favicon_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  cor_fundo: string;
  cor_texto: string;
  cor_destaque: string;
  printer_name: string;
  printer_width: number;
  stone_code: string;
  maquininha_ativa: boolean;
  mensagem_boas_vindas: string;
  mensagem_rodape_comanda: string;
  modo_chamada: string;
  modo_tela: string;
  metodos_pagamento: string[];
  mostrar_todos: boolean;
  webhook_comanda: string;
  plano: string;
  status: string;
  max_pedidos_mes: number;
}

// Estender o tipo Request do Express
declare global {
  namespace Express {
    interface Request {
      tenant: Tenant;
    }
  }
}

// Cache em memoria (Map simples, TTL 5 minutos)
const tenantCache = new Map<string, { tenant: Tenant; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getCached(slug: string): Tenant | null {
  const entry = tenantCache.get(slug);
  if (!entry) return null;

  if (Date.now() - entry.cachedAt > CACHE_TTL) {
    tenantCache.delete(slug);
    return null;
  }

  return entry.tenant;
}

function setCache(slug: string, tenant: Tenant): void {
  tenantCache.set(slug, { tenant, cachedAt: Date.now() });
}

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Extrair slug do Host header
    //    Host: "burguerx.autopay.xrtec1.com" → slug = "burguerx"
    //    Em dev: usa header X-Tenant-Slug como fallback
    const host = req.hostname;
    let slug = host.split('.')[0];

    // Fallback para desenvolvimento local (localhost nao tem subdominio)
    if (slug === 'localhost' || slug === '127') {
      slug = (req.headers['x-tenant-slug'] as string) || '';
    }

    // 2. Validar slug
    if (!slug || slug === 'autopay' || slug === 'www') {
      res.status(404).json({
        error: 'Acesse pelo subdominio do seu estabelecimento. Ex: suaempresa.autopay.xrtec1.com',
      });
      return;
    }

    // Sanitizar slug (so letras, numeros e hifen)
    if (!/^[a-z0-9-]+$/i.test(slug)) {
      res.status(400).json({ error: 'Subdominio invalido' });
      return;
    }

    // 3. Buscar no cache ou no banco
    let tenant = getCached(slug);

    if (!tenant) {
      const { data, error } = await supabase
        .from('ap_tenants')
        .select('*')
        .eq('slug', slug.toLowerCase())
        .eq('status', 'ativo')
        .single();

      if (error || !data) {
        res.status(404).json({ error: 'Estabelecimento nao encontrado' });
        return;
      }

      tenant = data as Tenant;
      setCache(slug, tenant);
    }

    // 4. Anexar ao request
    req.tenant = tenant;
    next();
  } catch (err) {
    console.error('[TenantMiddleware] Erro:', err);
    res.status(500).json({ error: 'Erro interno ao resolver estabelecimento' });
  }
}
