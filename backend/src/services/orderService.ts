import { supabase } from '../config/supabase';

interface ItemPedido {
  produto_id: string;
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
  adicionais: { nome: string; preco: number }[];
  observacao?: string;
}

interface CreateOrderInput {
  tenantId: string;
  numero_pager?: string;
  nome_cliente?: string;
  tipo_pagamento: 'dinheiro' | 'credito' | 'debito' | 'voucher';
  observacao?: string;
  itens: ItemPedido[];
}

/**
 * Gera numero do pedido: #YYYYMMDD-NNN
 * Incrementa sequencialmente dentro do mesmo dia.
 */
async function gerarNumeroPedido(tenantId: string): Promise<string> {
  const hoje = new Date();
  const prefix = `#${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}${String(hoje.getDate()).padStart(2, '0')}`;

  // Buscar ultimo pedido do dia
  const { data } = await supabase
    .from('ap_pedidos')
    .select('numero_pedido')
    .eq('tenant_id', tenantId)
    .like('numero_pedido', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(1);

  let seq = 100;
  if (data && data.length > 0) {
    const lastNum = data[0].numero_pedido.split('-')[1];
    seq = parseInt(lastNum, 10) + 1;
  }

  return `${prefix}-${seq}`;
}

/**
 * Gera codigo de comanda: 6 caracteres alfanumericos
 */
function gerarCodigoComanda(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1 pra evitar confusao
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

export async function criarPedido(input: CreateOrderInput) {
  const { tenantId, numero_pager, nome_cliente, tipo_pagamento, observacao, itens } = input;

  if (!itens || itens.length === 0) {
    throw new Error('Pedido deve ter pelo menos 1 item');
  }

  // Calcular totais
  let subtotal = 0;
  const itensProcessados = itens.map((item) => {
    const adicionaisTotal = item.adicionais.reduce((sum, a) => sum + a.preco, 0);
    const precoTotal = (item.preco_unitario + adicionaisTotal) * item.quantidade;
    subtotal += precoTotal;

    return {
      tenant_id: tenantId,
      produto_id: item.produto_id,
      nome_produto: item.nome_produto,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      preco_total: precoTotal,
      adicionais: item.adicionais,
      observacao: item.observacao || null,
    };
  });

  const numero_pedido = await gerarNumeroPedido(tenantId);
  const codigo_comanda = gerarCodigoComanda();

  // Criar pedido
  const { data: pedido, error: pedidoError } = await supabase
    .from('ap_pedidos')
    .insert({
      tenant_id: tenantId,
      numero_pedido,
      codigo_comanda,
      numero_pager: numero_pager || null,
      nome_cliente: nome_cliente || null,
      status: 'preparando',
      tipo_pagamento,
      subtotal,
      total: subtotal,
      observacao: observacao || null,
    })
    .select('id, numero_pedido, codigo_comanda, status, total, created_at')
    .single();

  if (pedidoError || !pedido) {
    console.error('[OrderService] Erro ao criar pedido:', pedidoError);
    throw new Error('Erro ao criar pedido');
  }

  // Criar itens do pedido
  const itensComPedidoId = itensProcessados.map((item) => ({
    ...item,
    pedido_id: pedido.id,
  }));

  const { error: itensError } = await supabase
    .from('ap_itens_pedido')
    .insert(itensComPedidoId);

  if (itensError) {
    console.error('[OrderService] Erro ao criar itens:', itensError);
    // Pedido ja foi criado, nao tem rollback facil com Supabase REST
    // Em producao, considerar usar function/transaction no Postgres
  }

  return pedido;
}
