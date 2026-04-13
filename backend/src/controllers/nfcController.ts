import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { consultarCpf } from '../services/cpfHubService';
import { validarTelefone } from '../services/phoneValidator';

// =============================================
// CONSULTA CPF (antes de cadastrar)
// =============================================

export async function consultarCpfEndpoint(req: Request, res: Response): Promise<void> {
  try {
    const { cpf } = req.params;
    const resultado = await consultarCpf(cpf);

    if (!resultado.sucesso) {
      res.status(400).json({ error: resultado.erro || 'CPF invalido' });
      return;
    }

    res.json({
      cpf: resultado.cpf,
      nome: resultado.nome,
      dataNascimento: resultado.dataNascimento,
      genero: resultado.genero
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar CPF' });
  }
}

// =============================================
// CADASTRAR CARTÃO NFC
// =============================================

export async function cadastrarCartao(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenant.id;
    const { cpf, telefone, uid_cartao } = req.body;

    if (!cpf || !telefone || !uid_cartao) {
      res.status(400).json({ error: 'CPF, telefone e UID do cartao sao obrigatorios' });
      return;
    }

    // Validar telefone
    const telValidacao = validarTelefone(telefone);
    if (!telValidacao.valido) {
      res.status(400).json({ error: telValidacao.erro });
      return;
    }

    // Consultar CPF na API
    const cpfResult = await consultarCpf(cpf);
    if (!cpfResult.sucesso) {
      res.status(400).json({ error: cpfResult.erro || 'CPF invalido ou nao encontrado' });
      return;
    }

    // Verificar se cartão já está em uso
    const { data: cartaoExistente } = await supabase
      .from('cartoes_nfc')
      .select('id, status, cliente_id')
      .eq('uid_cartao', uid_cartao)
      .eq('tenant_id', tenantId)
      .single();

    if (cartaoExistente && cartaoExistente.status === 'em_uso') {
      res.status(409).json({ error: 'Este cartao ja esta em uso. Feche a comanda primeiro.' });
      return;
    }

    // Buscar ou criar cliente
    let clienteId: string;
    const { data: clienteExistente } = await supabase
      .from('clientes_nfc')
      .select('id')
      .eq('cpf', cpfResult.cpf)
      .eq('tenant_id', tenantId)
      .single();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
      // Atualizar telefone se mudou
      await supabase
        .from('clientes_nfc')
        .update({ telefone: telValidacao.formatado })
        .eq('id', clienteId);
    } else {
      const { data: novoCliente, error: errCliente } = await supabase
        .from('clientes_nfc')
        .insert({
          tenant_id: tenantId,
          cpf: cpfResult.cpf,
          nome: cpfResult.nome,
          nome_upper: cpfResult.nomeUpper,
          genero: cpfResult.genero,
          data_nascimento: `${cpfResult.ano}-${String(cpfResult.mes).padStart(2, '0')}-${String(cpfResult.dia).padStart(2, '0')}`,
          telefone: telValidacao.formatado
        })
        .select()
        .single();

      if (errCliente || !novoCliente) {
        res.status(500).json({ error: 'Erro ao cadastrar cliente' });
        return;
      }
      clienteId = novoCliente.id;
    }

    // Criar ou atualizar cartão
    if (cartaoExistente) {
      await supabase
        .from('cartoes_nfc')
        .update({ cliente_id: clienteId, status: 'vinculado' })
        .eq('id', cartaoExistente.id);
    } else {
      await supabase
        .from('cartoes_nfc')
        .insert({
          tenant_id: tenantId,
          uid_cartao: uid_cartao,
          cliente_id: clienteId,
          status: 'vinculado'
        });
    }

    res.status(201).json({
      sucesso: true,
      cliente: {
        id: clienteId,
        nome: cpfResult.nome,
        cpf: cpfResult.cpf,
        telefone: telValidacao.formatado
      },
      cartao: { uid: uid_cartao, status: 'vinculado' }
    });
  } catch (err) {
    console.error('[NFC] Erro ao cadastrar:', err);
    res.status(500).json({ error: 'Erro ao cadastrar cartao' });
  }
}

// =============================================
// LER CARTÃO (identificar cliente)
// =============================================

export async function lerCartao(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenant.id;
    const { uid } = req.params;

    const { data: cartao } = await supabase
      .from('cartoes_nfc')
      .select('*, clientes_nfc(*)')
      .eq('uid_cartao', uid)
      .eq('tenant_id', tenantId)
      .single();

    if (!cartao) {
      res.status(404).json({ error: 'Cartao nao cadastrado', cadastrado: false });
      return;
    }

    // Buscar comanda aberta
    const { data: comanda } = await supabase
      .from('comandas_nfc')
      .select('*, itens_comanda_nfc(*)')
      .eq('cartao_id', cartao.id)
      .eq('status', 'aberta')
      .single();

    res.json({
      cadastrado: true,
      cartao: { id: cartao.id, uid: cartao.uid_cartao, status: cartao.status },
      cliente: cartao.clientes_nfc,
      comanda: comanda || null
    });
  } catch (err) {
    console.error('[NFC] Erro ao ler cartao:', err);
    res.status(500).json({ error: 'Erro ao ler cartao' });
  }
}

// =============================================
// ABRIR COMANDA
// =============================================

export async function abrirComanda(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenant.id;
    const { uid_cartao, modo } = req.body; // modo: 'prepago' ou 'pospago'

    // Buscar cartão
    const { data: cartao } = await supabase
      .from('cartoes_nfc')
      .select('id, cliente_id, status')
      .eq('uid_cartao', uid_cartao)
      .eq('tenant_id', tenantId)
      .single();

    if (!cartao || !cartao.cliente_id) {
      res.status(404).json({ error: 'Cartao nao cadastrado' });
      return;
    }

    // Verificar se já tem comanda aberta
    const { data: comandaExistente } = await supabase
      .from('comandas_nfc')
      .select('id')
      .eq('cartao_id', cartao.id)
      .eq('status', 'aberta')
      .single();

    if (comandaExistente) {
      res.status(409).json({ error: 'Ja existe uma comanda aberta pra este cartao', comanda_id: comandaExistente.id });
      return;
    }

    // Criar comanda
    const { data: comanda, error } = await supabase
      .from('comandas_nfc')
      .insert({
        tenant_id: tenantId,
        cartao_id: cartao.id,
        cliente_id: cartao.cliente_id,
        modo: modo || 'prepago',
        saldo: 0,
        total_consumido: 0,
        status: 'aberta'
      })
      .select()
      .single();

    if (error || !comanda) {
      res.status(500).json({ error: 'Erro ao abrir comanda' });
      return;
    }

    // Marcar cartão como em uso
    await supabase
      .from('cartoes_nfc')
      .update({ status: 'em_uso' })
      .eq('id', cartao.id);

    res.status(201).json({ sucesso: true, comanda });
  } catch (err) {
    console.error('[NFC] Erro ao abrir comanda:', err);
    res.status(500).json({ error: 'Erro ao abrir comanda' });
  }
}

// =============================================
// RECARREGAR (pré-pago)
// =============================================

export async function recarregar(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params; // comanda_id
    const { valor, tipo_pagamento, nsu } = req.body;

    if (!valor || valor <= 0) {
      res.status(400).json({ error: 'Valor deve ser maior que zero' });
      return;
    }

    // Buscar comanda
    const { data: comanda } = await supabase
      .from('comandas_nfc')
      .select('*')
      .eq('id', id)
      .eq('status', 'aberta')
      .single();

    if (!comanda) {
      res.status(404).json({ error: 'Comanda nao encontrada ou fechada' });
      return;
    }

    // Registrar recarga
    await supabase
      .from('recargas_nfc')
      .insert({
        comanda_id: id,
        valor: valor,
        tipo_pagamento: tipo_pagamento || 'credito',
        nsu: nsu || null
      });

    // Atualizar saldo
    const novoSaldo = Number(comanda.saldo) + Number(valor);
    await supabase
      .from('comandas_nfc')
      .update({ saldo: novoSaldo })
      .eq('id', id);

    res.json({ sucesso: true, saldo_anterior: comanda.saldo, recarga: valor, saldo_atual: novoSaldo });
  } catch (err) {
    console.error('[NFC] Erro na recarga:', err);
    res.status(500).json({ error: 'Erro ao recarregar' });
  }
}

// =============================================
// ADICIONAR ITEM NA COMANDA
// =============================================

export async function adicionarItem(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params; // comanda_id
    const { produto_id, nome_produto, quantidade, preco_unitario } = req.body;

    // Buscar comanda
    const { data: comanda } = await supabase
      .from('comandas_nfc')
      .select('*')
      .eq('id', id)
      .eq('status', 'aberta')
      .single();

    if (!comanda) {
      res.status(404).json({ error: 'Comanda nao encontrada ou fechada' });
      return;
    }

    const precoTotal = Number(preco_unitario) * Number(quantidade);

    // Se pré-pago, verificar saldo
    if (comanda.modo === 'prepago') {
      const saldoDisponivel = Number(comanda.saldo) - Number(comanda.total_consumido);
      if (precoTotal > saldoDisponivel) {
        res.status(400).json({
          error: 'Saldo insuficiente',
          saldo_disponivel: saldoDisponivel,
          valor_item: precoTotal
        });
        return;
      }
    }

    // Adicionar item
    const { data: item, error } = await supabase
      .from('itens_comanda_nfc')
      .insert({
        comanda_id: id,
        produto_id,
        nome_produto,
        quantidade,
        preco_unitario,
        preco_total: precoTotal
      })
      .select()
      .single();

    if (error || !item) {
      res.status(500).json({ error: 'Erro ao adicionar item' });
      return;
    }

    // Atualizar total consumido
    const novoTotal = Number(comanda.total_consumido) + precoTotal;
    await supabase
      .from('comandas_nfc')
      .update({ total_consumido: novoTotal })
      .eq('id', id);

    const saldoDisponivel = comanda.modo === 'prepago'
      ? Number(comanda.saldo) - novoTotal
      : null;

    res.json({
      sucesso: true,
      item,
      total_consumido: novoTotal,
      saldo_disponivel: saldoDisponivel
    });
  } catch (err) {
    console.error('[NFC] Erro ao adicionar item:', err);
    res.status(500).json({ error: 'Erro ao adicionar item' });
  }
}

// =============================================
// VER COMANDA (itens + total)
// =============================================

export async function verComanda(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const { data: comanda } = await supabase
      .from('comandas_nfc')
      .select('*, itens_comanda_nfc(*), clientes_nfc(*), cartoes_nfc(*)')
      .eq('id', id)
      .single();

    if (!comanda) {
      res.status(404).json({ error: 'Comanda nao encontrada' });
      return;
    }

    res.json(comanda);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar comanda' });
  }
}

// =============================================
// FECHAR COMANDA
// =============================================

export async function fecharComanda(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { tipo_pagamento, nsu } = req.body;

    const { data: comanda } = await supabase
      .from('comandas_nfc')
      .select('*, cartoes_nfc(*)')
      .eq('id', id)
      .eq('status', 'aberta')
      .single();

    if (!comanda) {
      res.status(404).json({ error: 'Comanda nao encontrada ou ja fechada' });
      return;
    }

    // Fechar comanda
    await supabase
      .from('comandas_nfc')
      .update({
        status: 'fechada',
        paga: true,
        fechada_em: new Date().toISOString()
      })
      .eq('id', id);

    // Liberar cartão (volta pro estoque)
    await supabase
      .from('cartoes_nfc')
      .update({ status: 'disponivel', cliente_id: null })
      .eq('id', comanda.cartao_id);

    res.json({
      sucesso: true,
      total: comanda.total_consumido,
      modo: comanda.modo,
      message: 'Comanda fechada e cartao liberado'
    });
  } catch (err) {
    console.error('[NFC] Erro ao fechar comanda:', err);
    res.status(500).json({ error: 'Erro ao fechar comanda' });
  }
}

// =============================================
// LISTAR COMANDAS ABERTAS (painel/CRM)
// =============================================

export async function listarComandasAbertas(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenant.id;

    const { data, error } = await supabase
      .from('comandas_nfc')
      .select('*, clientes_nfc(nome, cpf, telefone), itens_comanda_nfc(nome_produto, quantidade, preco_total)')
      .eq('tenant_id', tenantId)
      .eq('status', 'aberta')
      .order('aberta_em', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Erro ao listar comandas' });
      return;
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar comandas' });
  }
}

// =============================================
// HISTÓRICO DO CLIENTE (CRM)
// =============================================

export async function historicoCliente(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenant.id;
    const { cpf } = req.params;

    // Buscar cliente
    const { data: cliente } = await supabase
      .from('clientes_nfc')
      .select('*')
      .eq('cpf', cpf.replace(/\D/g, ''))
      .eq('tenant_id', tenantId)
      .single();

    if (!cliente) {
      res.status(404).json({ error: 'Cliente nao encontrado' });
      return;
    }

    // Buscar todas as comandas do cliente
    const { data: comandas } = await supabase
      .from('comandas_nfc')
      .select('*, itens_comanda_nfc(*), recargas_nfc(*)')
      .eq('cliente_id', cliente.id)
      .order('aberta_em', { ascending: false });

    res.json({
      cliente,
      comandas: comandas || [],
      total_gasto: (comandas || []).reduce((sum, c) => sum + Number(c.total_consumido), 0),
      total_comandas: (comandas || []).length
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar historico' });
  }
}

// =============================================
// ENVIAR COBRANÇA WHATSAPP
// =============================================

export async function enviarCobranca(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params; // comanda_id

    const { data: comanda } = await supabase
      .from('comandas_nfc')
      .select('*, clientes_nfc(nome, cpf, telefone)')
      .eq('id', id)
      .single();

    if (!comanda || !comanda.clientes_nfc) {
      res.status(404).json({ error: 'Comanda nao encontrada' });
      return;
    }

    const cliente = comanda.clientes_nfc;
    const valor = Number(comanda.total_consumido).toFixed(2).replace('.', ',');
    const telefone = cliente.telefone;
    const nome = cliente.nome.split(' ')[0]; // Primeiro nome

    const mensagem = `Ola ${nome}, voce tem uma comanda em aberto no valor de R$ ${valor}. Por favor, regularize seu pagamento. Obrigado!`;

    // Gerar link WhatsApp
    const whatsappUrl = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;

    // Registrar cobrança
    await supabase
      .from('cobrancas_nfc')
      .insert({
        comanda_id: id,
        mensagem,
        telefone
      });

    res.json({
      sucesso: true,
      whatsapp_url: whatsappUrl,
      mensagem,
      telefone,
      nome: cliente.nome,
      valor: comanda.total_consumido
    });
  } catch (err) {
    console.error('[NFC] Erro ao enviar cobranca:', err);
    res.status(500).json({ error: 'Erro ao enviar cobranca' });
  }
}
