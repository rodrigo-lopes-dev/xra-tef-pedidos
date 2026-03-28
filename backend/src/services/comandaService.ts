/**
 * Envia comanda para o webhook do n8n (que repassa pro print server local).
 * Payload limpo sem campos legados (telefone, pix, etc).
 */
export async function enviarComanda(
  tenantId: string,
  pedido: any,
  itens: any[],
  webhookUrl: string,
  mensagemRodape: string
): Promise<void> {
  if (!webhookUrl) {
    console.warn('[ComandaService] Webhook URL nao configurada, comanda nao enviada');
    return;
  }

  const agora = new Date();
  const dataHora = agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const payload = {
    codigo: pedido.codigo_comanda,
    numero_pedido: pedido.numero_pedido,
    data_hora: dataHora,
    numero_pager: pedido.numero_pager || '',
    nome_cliente: pedido.nome_cliente || '',
    valor_total: pedido.total,
    tipo_pagamento: pedido.tipo_pagamento,
    itens: itens.map((item: any) => ({
      quantidade: item.quantidade,
      nome: item.nome_produto,
      preco_unitario: item.preco_unitario,
      adicionais: item.adicionais || [],
      observacoes: item.observacao || null,
    })),
    observacoes_pedido: pedido.observacao || null,
    status: pedido.status,
    mensagem_rodape: mensagemRodape,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[ComandaService] Webhook retornou ${response.status}`);
    } else {
      console.log(`[ComandaService] Comanda ${pedido.codigo_comanda} enviada com sucesso`);
    }
  } catch (err) {
    console.error('[ComandaService] Erro ao enviar comanda:', err);
  }
}
