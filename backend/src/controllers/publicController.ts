import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

/**
 * GET /api/tenant/config
 * Retorna branding e configuracoes publicas do tenant.
 * Usado pelo frontend para carregar tema, logo, cores.
 * NAO retorna dados sensiveis (stone_code, printer_name, etc).
 */
export async function getTenantConfig(req: Request, res: Response): Promise<void> {
  const t = req.tenant;

  res.json({
    nome: t.nome,
    slug: t.slug,
    logo_url: t.logo_url,
    favicon_url: t.favicon_url,
    cor_primaria: t.cor_primaria,
    cor_secundaria: t.cor_secundaria,
    cor_fundo: t.cor_fundo,
    cor_texto: t.cor_texto,
    cor_destaque: t.cor_destaque,
    maquininha_ativa: t.maquininha_ativa,
    mensagem_boas_vindas: t.mensagem_boas_vindas,
    modo_chamada: t.modo_chamada || 'pager',
    modo_tela: t.modo_tela || 'monitor',
    metodos_pagamento: t.metodos_pagamento || ['dinheiro', 'credito', 'debito', 'voucher'],
    mostrar_todos: t.mostrar_todos !== false,
  });
}

/**
 * GET /api/categories
 * Retorna categorias ativas do tenant, ordenadas.
 */
export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('ap_categorias')
      .select('id, nome, imagem, ordem')
      .eq('tenant_id', req.tenant.id)
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    if (error) {
      console.error('[PublicController] Erro ao buscar categorias:', error);
      res.status(500).json({ error: 'Erro ao buscar categorias' });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('[PublicController] Erro:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

/**
 * GET /api/products
 * Retorna produtos ativos do tenant, ordenados.
 * Aceita query ?categoria_id=UUID para filtrar por categoria.
 */
export async function getProducts(req: Request, res: Response): Promise<void> {
  try {
    let query = supabase
      .from('ap_produtos')
      .select('id, categoria_id, nome, descricao, preco, imagem, destaque, ordem')
      .eq('tenant_id', req.tenant.id)
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    // Filtro por categoria (opcional)
    const categoriaId = req.query.categoria_id as string;
    if (categoriaId) {
      query = query.eq('categoria_id', categoriaId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[PublicController] Erro ao buscar produtos:', error);
      res.status(500).json({ error: 'Erro ao buscar produtos' });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('[PublicController] Erro:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

/**
 * GET /api/products/:id
 * Retorna detalhe de um produto.
 */
export async function getProductById(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('ap_produtos')
      .select('id, categoria_id, nome, descricao, preco, imagem, destaque')
      .eq('tenant_id', req.tenant.id)
      .eq('id', req.params.id)
      .eq('ativo', true)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Produto nao encontrado' });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('[PublicController] Erro:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

/**
 * GET /api/extras
 * Retorna adicionais ativos do tenant, ordenados.
 */
export async function getExtras(req: Request, res: Response): Promise<void> {
  try {
    let query = supabase
      .from('ap_adicionais')
      .select('id, nome, preco, ordem')
      .eq('tenant_id', req.tenant.id)
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    // Filtrar por categoria (so mostra adicionais da categoria do produto)
    const categoriaId = req.query.categoria_id as string;
    if (categoriaId) {
      query = query.eq('categoria_id', categoriaId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[PublicController] Erro ao buscar adicionais:', error);
      res.status(500).json({ error: 'Erro ao buscar adicionais' });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('[PublicController] Erro:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}
