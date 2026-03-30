import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

const STATUS_VALIDOS = ['novo', 'preparando', 'pronto', 'entregue', 'cancelado'];

/**
 * GET /api/admin/orders
 * Lista pedidos do tenant. Aceita ?status=novo,preparando
 */
export async function listOrders(req: Request, res: Response): Promise<void> {
  try {
    let query = supabase
      .from('ap_pedidos')
      .select('id, numero_pedido, codigo_comanda, numero_pager, nome_cliente, status, tipo_pagamento, total, observacao, created_at, updated_at')
      .eq('tenant_id', req.tenant.id)
      .order('created_at', { ascending: false });

    // Filtro por status (virgula separada)
    const statusFilter = req.query.status as string;
    if (statusFilter) {
      const statuses = statusFilter.split(',').filter(s => STATUS_VALIDOS.includes(s));
      if (statuses.length > 0) {
        query = query.in('status', statuses);
      }
    }

    // Limite
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('[AdminOrderController] Erro ao listar pedidos:', error);
      res.status(500).json({ error: 'Erro ao listar pedidos' });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('[AdminOrderController] Erro:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

/**
 * GET /api/admin/orders/:id
 * Detalhe de um pedido com itens
 */
export async function getOrderDetail(req: Request, res: Response): Promise<void> {
  try {
    const { data: pedido, error } = await supabase
      .from('ap_pedidos')
      .select('*')
      .eq('tenant_id', req.tenant.id)
      .eq('id', req.params.id)
      .single();

    if (error || !pedido) {
      res.status(404).json({ error: 'Pedido nao encontrado' });
      return;
    }

    const { data: itens } = await supabase
      .from('ap_itens_pedido')
      .select('*')
      .eq('pedido_id', pedido.id)
      .eq('tenant_id', req.tenant.id);

    res.json({ ...pedido, itens: itens || [] });
  } catch (err) {
    console.error('[AdminOrderController] Erro:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

/**
 * PATCH /api/admin/orders/:id/status
 * Atualiza status do pedido
 */
export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const { status } = req.body;

    if (!status || !STATUS_VALIDOS.includes(status)) {
      res.status(400).json({ error: 'Status invalido' });
      return;
    }

    const { data, error } = await supabase
      .from('ap_pedidos')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('tenant_id', req.tenant.id)
      .eq('id', req.params.id)
      .select('id, numero_pedido, codigo_comanda, numero_pager, nome_cliente, status, total, updated_at')
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Pedido nao encontrado' });
      return;
    }

    // Emitir Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${req.tenant.id}`).emit('pedido_atualizado', data);
    }

    res.json(data);
  } catch (err) {
    console.error('[AdminOrderController] Erro:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}
