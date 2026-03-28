import { Request, Response } from 'express';
import { criarPedido } from '../services/orderService';
import { enviarComanda } from '../services/comandaService';

/**
 * POST /api/orders
 * Cria um novo pedido (chamado pelo totem do cliente).
 */
export async function createOrder(req: Request, res: Response): Promise<void> {
  try {
    const { numero_pager, nome_cliente, tipo_pagamento, observacao, itens } = req.body;

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      res.status(400).json({ error: 'Pedido deve ter pelo menos 1 item' });
      return;
    }

    const metodosPermitidos = req.tenant.metodos_pagamento || ['dinheiro', 'credito', 'debito', 'voucher'];
    if (!tipo_pagamento || !metodosPermitidos.includes(tipo_pagamento)) {
      res.status(400).json({ error: 'Tipo de pagamento invalido ou nao permitido' });
      return;
    }

    // Validar cada item
    for (const item of itens) {
      if (!item.produto_id || !item.nome_produto || !item.quantidade || !item.preco_unitario) {
        res.status(400).json({ error: 'Item do pedido incompleto' });
        return;
      }
      if (item.quantidade < 1 || item.quantidade > 99) {
        res.status(400).json({ error: 'Quantidade invalida' });
        return;
      }
    }

    const pedido = await criarPedido({
      tenantId: req.tenant.id,
      numero_pager,
      nome_cliente,
      tipo_pagamento,
      observacao,
      itens,
    });

    // Emitir evento Socket.IO para a cozinha
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${req.tenant.id}`).emit('novo_pedido', pedido);
    }

    // Enviar comanda pro webhook (n8n → impressora local)
    // Nao bloqueia a resposta — envia em background
    const webhookUrl = (req.tenant as any).webhook_comanda;
    if (webhookUrl) {
      enviarComanda(
        req.tenant.id,
        { ...pedido, numero_pager, nome_cliente, tipo_pagamento, observacao },
        itens,
        webhookUrl,
        req.tenant.mensagem_rodape_comanda || ''
      ).catch((err) => console.error('[OrderController] Erro webhook:', err));
    }

    res.status(201).json(pedido);
  } catch (err: any) {
    console.error('[OrderController] Erro:', err);
    res.status(500).json({ error: err.message || 'Erro ao criar pedido' });
  }
}
