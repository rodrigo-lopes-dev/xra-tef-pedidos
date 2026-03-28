import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// =============================================
// PRODUTOS
// =============================================

export async function listProducts(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('ap_produtos')
      .select('id, categoria_id, nome, descricao, preco, imagem, ativo, destaque, ordem, created_at')
      .eq('tenant_id', req.tenant.id)
      .order('ordem', { ascending: true });

    if (error) { res.status(500).json({ error: 'Erro ao listar produtos' }); return; }
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const { nome, descricao, preco, imagem, categoria_id, ativo, destaque, ordem } = req.body;
    if (!nome || preco === undefined) { res.status(400).json({ error: 'Nome e preco sao obrigatorios' }); return; }

    const { data, error } = await supabase
      .from('ap_produtos')
      .insert({ tenant_id: req.tenant.id, nome, descricao, preco, imagem, categoria_id, ativo: ativo ?? true, destaque: destaque ?? false, ordem: ordem ?? 0 })
      .select()
      .single();

    if (error) { res.status(500).json({ error: 'Erro ao criar produto' }); return; }
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const { nome, descricao, preco, imagem, categoria_id, ativo, destaque, ordem } = req.body;

    const { data, error } = await supabase
      .from('ap_produtos')
      .update({ nome, descricao, preco, imagem, categoria_id, ativo, destaque, ordem })
      .eq('tenant_id', req.tenant.id)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) { res.status(404).json({ error: 'Produto nao encontrado' }); return; }
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    const { error } = await supabase
      .from('ap_produtos')
      .delete()
      .eq('tenant_id', req.tenant.id)
      .eq('id', req.params.id);

    if (error) { res.status(500).json({ error: 'Erro ao remover produto' }); return; }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
}

// =============================================
// CATEGORIAS
// =============================================

export async function listCategories(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('ap_categorias')
      .select('id, nome, imagem, ordem, ativo, created_at')
      .eq('tenant_id', req.tenant.id)
      .order('ordem', { ascending: true });

    if (error) { res.status(500).json({ error: 'Erro ao listar categorias' }); return; }
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    const { nome, imagem, ordem, ativo } = req.body;
    if (!nome) { res.status(400).json({ error: 'Nome e obrigatorio' }); return; }

    const { data, error } = await supabase
      .from('ap_categorias')
      .insert({ tenant_id: req.tenant.id, nome, imagem, ordem: ordem ?? 0, ativo: ativo ?? true })
      .select()
      .single();

    if (error) { res.status(500).json({ error: 'Erro ao criar categoria' }); return; }
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  try {
    const { nome, imagem, ordem, ativo } = req.body;

    const { data, error } = await supabase
      .from('ap_categorias')
      .update({ nome, imagem, ordem, ativo })
      .eq('tenant_id', req.tenant.id)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) { res.status(404).json({ error: 'Categoria nao encontrada' }); return; }
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  try {
    const { error } = await supabase
      .from('ap_categorias')
      .delete()
      .eq('tenant_id', req.tenant.id)
      .eq('id', req.params.id);

    if (error) { res.status(500).json({ error: 'Erro ao remover categoria' }); return; }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
}

// =============================================
// ADICIONAIS
// =============================================

export async function listExtras(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('ap_adicionais')
      .select('id, nome, preco, ordem, ativo, categoria_id, created_at')
      .eq('tenant_id', req.tenant.id)
      .order('ordem', { ascending: true });

    if (error) { res.status(500).json({ error: 'Erro ao listar adicionais' }); return; }
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
}

export async function createExtra(req: Request, res: Response): Promise<void> {
  try {
    const { nome, preco, ordem, ativo, categoria_id } = req.body;
    if (!nome || preco === undefined) { res.status(400).json({ error: 'Nome e preco sao obrigatorios' }); return; }

    const { data, error } = await supabase
      .from('ap_adicionais')
      .insert({ tenant_id: req.tenant.id, nome, preco, ordem: ordem ?? 0, ativo: ativo ?? true, categoria_id })
      .select()
      .single();

    if (error) { res.status(500).json({ error: 'Erro ao criar adicional' }); return; }
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
}

export async function updateExtra(req: Request, res: Response): Promise<void> {
  try {
    const { nome, preco, ordem, ativo, categoria_id } = req.body;

    const { data, error } = await supabase
      .from('ap_adicionais')
      .update({ nome, preco, ordem, ativo, categoria_id })
      .eq('tenant_id', req.tenant.id)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) { res.status(404).json({ error: 'Adicional nao encontrado' }); return; }
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
}

export async function deleteExtra(req: Request, res: Response): Promise<void> {
  try {
    const { error } = await supabase
      .from('ap_adicionais')
      .delete()
      .eq('tenant_id', req.tenant.id)
      .eq('id', req.params.id);

    if (error) { res.status(500).json({ error: 'Erro ao remover adicional' }); return; }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
}

// =============================================
// CONFIGURACOES DO TENANT
// =============================================

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('ap_tenants')
      .select('*')
      .eq('id', req.tenant.id)
      .single();

    if (error || !data) { res.status(404).json({ error: 'Tenant nao encontrado' }); return; }
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    // Campos que o admin pode alterar
    const allowedFields = [
      'nome', 'logo_url', 'favicon_url',
      'cor_primaria', 'cor_secundaria', 'cor_fundo', 'cor_texto', 'cor_destaque',
      'printer_name', 'printer_width', 'stone_code', 'maquininha_ativa',
      'mensagem_boas_vindas', 'mensagem_rodape_comanda',
      'modo_chamada', 'modo_tela', 'metodos_pagamento', 'mostrar_todos',
      'webhook_comanda',
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'Nenhum campo para atualizar' });
      return;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('ap_tenants')
      .update(updates)
      .eq('id', req.tenant.id)
      .select()
      .single();

    if (error || !data) { res.status(500).json({ error: 'Erro ao atualizar configuracoes' }); return; }
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
}

// =============================================
// DASHBOARD (vendas do dia)
// =============================================

export async function getDailySales(req: Request, res: Response): Promise<void> {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('ap_pedidos')
      .select('id, total, status, tipo_pagamento, created_at')
      .eq('tenant_id', req.tenant.id)
      .gte('created_at', hoje.toISOString());

    if (error) { res.status(500).json({ error: 'Erro ao buscar vendas' }); return; }

    const pedidos = data || [];
    const totalVendas = pedidos.filter(p => p.status !== 'cancelado').reduce((sum, p) => sum + Number(p.total), 0);
    const totalPedidos = pedidos.filter(p => p.status !== 'cancelado').length;
    const porStatus = {
      preparando: pedidos.filter(p => p.status === 'preparando').length,
      pronto: pedidos.filter(p => p.status === 'pronto').length,
      entregue: pedidos.filter(p => p.status === 'entregue').length,
      cancelado: pedidos.filter(p => p.status === 'cancelado').length,
    };
    const porPagamento = {
      dinheiro: pedidos.filter(p => p.tipo_pagamento === 'dinheiro' && p.status !== 'cancelado').length,
      credito: pedidos.filter(p => p.tipo_pagamento === 'credito' && p.status !== 'cancelado').length,
      debito: pedidos.filter(p => p.tipo_pagamento === 'debito' && p.status !== 'cancelado').length,
      voucher: pedidos.filter(p => p.tipo_pagamento === 'voucher' && p.status !== 'cancelado').length,
    };

    res.json({ totalVendas, totalPedidos, porStatus, porPagamento, pedidos });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
}
