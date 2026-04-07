import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useCart } from '../../contexts/CartContext';
import { api } from '../../services/api';
import NumericKeypad from '../../components/NumericKeypad';
import ScreenKeyboard from '../../components/ScreenKeyboard';

type KeyboardMode = null | 'pager' | 'nome' | 'observacao' | 'pagamento';
type TefStatus = null | 'aguardando' | 'aprovado' | 'negado' | 'erro';

const PRINT_SERVER_URL = 'http://localhost:5556';

export default function CartPage() {
  const { tenant } = useTenant();
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCart();
  const navigate = useNavigate();
  const [numeroPager, setNumeroPager] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [tipoPagamento, setTipoPagamento] = useState<'dinheiro' | 'credito' | 'debito' | 'voucher'>('dinheiro');
  const [observacao, setObservacao] = useState('');
  const [, setLoading] = useState(false);
  const [pedidoCriado, setPedidoCriado] = useState<{ numero_pedido: string; codigo_comanda: string } | null>(null);
  const [keyboard, setKeyboard] = useState<KeyboardMode>(null);

  // TEF (maquininha Stone)
  const [tefStatus, setTefStatus] = useState<TefStatus>(null);
  const [tefMensagem, setTefMensagem] = useState('');
  const [tefDadosAprovado, setTefDadosAprovado] = useState<Record<string, any> | null>(null);

  const primary = tenant?.cor_primaria || '#3B82F6';
  const secondary = tenant?.cor_secundaria || '#1E40AF';
  const bg = tenant?.cor_fundo || '#0F172A';
  const text = tenant?.cor_texto || '#FFFFFF';
  const accent = tenant?.cor_destaque || '#60A5FA';
  const modoChamada = tenant?.modo_chamada || 'pager';
  const modoTela = tenant?.modo_tela || 'monitor';
  const isTablet = modoTela === 'tablet';
  const metodosPagamento = tenant?.metodos_pagamento || ['dinheiro', 'credito', 'debito', 'voucher'];

  function calcItemTotal(item: typeof items[number]): number {
    const adicionaisTotal = item.adicionais.reduce((sum: number, a: { preco: number }) => sum + a.preco, 0);
    return (item.preco_unitario + adicionaisTotal) * item.quantidade;
  }

  const maquininhaAtiva = tenant?.maquininha_ativa ?? false;

  // Chama o TEF (maquininha Stone) via print server local
  async function chamarTEF(tipo: string, valor: number): Promise<{ sucesso: boolean; dados?: Record<string, any>; mensagem?: string }> {
    try {
      const resp = await fetch(`${PRINT_SERVER_URL}/tef/venda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor, tipo }),
      });

      const data = await resp.json();

      if (data.sucesso) {
        return { sucesso: true, dados: data };
      } else {
        return { sucesso: false, mensagem: data.mensagem || 'Transacao nao autorizada' };
      }
    } catch (err: any) {
      // Print server offline ou erro de rede
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        return { sucesso: false, mensagem: 'Maquininha indisponivel. Verifique se o servidor de impressao esta ligado.' };
      }
      return { sucesso: false, mensagem: err.message || 'Erro ao conectar com a maquininha' };
    }
  }

  // Fluxo principal ao selecionar metodo de pagamento
  async function handlePagamento(metodo: 'dinheiro' | 'credito' | 'debito' | 'voucher') {
    if (items.length === 0) return;

    setTipoPagamento(metodo);
    setKeyboard(null);

    const ehCartao = metodo !== 'dinheiro';

    // Se cartao E maquininha ativa → passa pelo TEF primeiro
    if (ehCartao && maquininhaAtiva) {
      setTefStatus('aguardando');
      setTefMensagem('Aproxime ou insira o cartao na maquininha...');

      const resultado = await chamarTEF(metodo, totalPrice);

      if (resultado.sucesso) {
        setTefStatus('aprovado');
        setTefDadosAprovado(resultado.dados || null);
        setTefMensagem('Pagamento aprovado!');
        // Criar pedido apos aprovacao
        await criarPedido(metodo);
      } else {
        setTefStatus('negado');
        setTefMensagem(resultado.mensagem || 'Pagamento nao autorizado');
      }
    } else {
      // Dinheiro OU maquininha desativada → cria pedido direto
      await criarPedido(metodo);
    }
  }

  // Tentar novamente apos negado
  async function handleTentarNovamente() {
    setTefStatus('aguardando');
    setTefMensagem('Aproxime ou insira o cartao na maquininha...');
    setTefDadosAprovado(null);

    const resultado = await chamarTEF(tipoPagamento, totalPrice);

    if (resultado.sucesso) {
      setTefStatus('aprovado');
      setTefDadosAprovado(resultado.dados || null);
      setTefMensagem('Pagamento aprovado!');
      await criarPedido(tipoPagamento);
    } else {
      setTefStatus('negado');
      setTefMensagem(resultado.mensagem || 'Pagamento nao autorizado');
    }
  }

  // Cria pedido no backend
  async function criarPedido(metodo: string) {
    setLoading(true);

    try {
      const body = {
        numero_pager: numeroPager || undefined,
        nome_cliente: nomeCliente || undefined,
        tipo_pagamento: metodo,
        observacao: observacao || undefined,
        itens: items.map((item) => ({
          produto_id: item.produto_id,
          nome_produto: item.nome,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          adicionais: item.adicionais,
          observacao: item.observacao || undefined,
        })),
      };

      const result = await api<{ numero_pedido: string; codigo_comanda: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify(body),
        skipAuth: true,
      });

      setTefStatus(null);
      setPedidoCriado(result);
      clearCart();
    } catch (err: any) {
      setTefStatus(null);
      alert(err.message || 'Erro ao criar pedido');
    } finally {
      setLoading(false);
    }
  }

  // =============================================
  // TELA DE SUCESSO — auto redirect 8s
  // =============================================
  if (pedidoCriado) {
    return <SuccessScreen
      pedido={pedidoCriado}
      bg={bg}
      text={text}
      accent={accent}
      numeroPager={numeroPager}
      nomeCliente={nomeCliente}
      navigate={navigate}
    />;
  }

  // =============================================
  // CARRINHO VAZIO
  // =============================================
  if (items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: bg, display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: text, opacity: 0.3, fontSize: '20px', marginBottom: '20px' }}>Carrinho vazio</p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '16px 40px', borderRadius: '14px', border: 'none',
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              color: text, fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
            }}
          >
            Ver cardapio
          </button>
        </div>
      </div>
    );
  }

  // =============================================
  // CARRINHO — layout compacto pro tablet
  // =============================================
  return (
    <div style={{ height: '100vh', backgroundColor: bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header fixo */}
      <header
        style={{
          padding: '16px 24px',
          background: `linear-gradient(135deg, ${secondary}, ${primary}90)`,
          borderBottom: `1px solid ${primary}30`,
          display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            width: '40px', height: '40px', borderRadius: '10px',
            border: `1px solid ${text}30`, backgroundColor: 'transparent',
            color: text, cursor: 'pointer', display: 'grid', placeItems: 'center',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 style={{ color: text, fontSize: '20px', fontWeight: 'bold', margin: 0, flex: 1 }}>Seu Pedido</h1>
        <span style={{ color: accent, fontSize: '22px', fontWeight: 'bold' }}>
          R$ {totalPrice.toFixed(2).replace('.', ',')}
        </span>
      </header>

      {/* Content — lado a lado: itens (esquerda) + pager/finalizar (direita) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: 'row' }}>
        {/* Itens */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '16px', borderRadius: '14px',
                background: `${primary}10`, border: `1px solid ${primary}20`,
                marginBottom: '12px', display: 'flex', gap: '14px',
              }}
            >
              {item.imagem ? (
                <img src={item.imagem} alt={item.nome}
                  style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '60px', height: '60px', borderRadius: '10px', backgroundColor: `${primary}15`, flexShrink: 0 }} />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: text, fontSize: '16px', fontWeight: 'bold' }}>{item.nome}</span>
                  <button onClick={() => removeItem(item.id)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    X
                  </button>
                </div>
                {item.adicionais.length > 0 && (
                  <p style={{ color: text, opacity: 0.4, fontSize: '12px', margin: '2px 0 0' }}>
                    {item.adicionais.map(a => `+ ${a.nome}`).join(', ')}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${primary}40`,
                        backgroundColor: `${primary}15`, color: text, fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                      -
                    </button>
                    <span style={{ color: text, fontSize: '16px', fontWeight: 'bold' }}>{item.quantidade}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${primary}40`,
                        backgroundColor: `${primary}15`, color: text, fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                      +
                    </button>
                  </div>
                  <span style={{ color: accent, fontSize: '17px', fontWeight: 'bold' }}>
                    R$ {calcItemTotal(item).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Config do pedido — lado direito */}
        <div style={{
          flex: 1,
          borderLeft: `1px solid ${primary}20`,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '16px',
          overflowY: 'auto',
          flexShrink: 0,
        }}>

          {/* Titulo central */}
          <div style={{ width: '100%', textAlign: 'center', padding: '10px 0' }}>
            <h2 style={{ color: text, fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
              {modoChamada === 'nome'
                ? 'Digite seu Nome'
                : modoChamada === 'ambos'
                  ? 'Digite seu Pager ou Nome'
                  : 'Digite seu Pager'}
            </h2>
          </div>

          {/* Campo central — Pager ou Nome (conforme config do tenant) */}
          {modoChamada === 'pager' && (
            <button
              onClick={() => setKeyboard('pager')}
              style={{
                width: '100%', padding: '30px', borderRadius: '18px', cursor: 'pointer', textAlign: 'center',
                background: `${primary}10`, border: `1px solid ${primary}25`,
              }}
            >
              <span style={{
                color: numeroPager ? accent : `${text}20`,
                fontSize: '48px', fontWeight: 'bold', letterSpacing: '10px', fontFamily: 'monospace',
              }}>
                {numeroPager || '_ _ _'}
              </span>
            </button>
          )}

          {modoChamada === 'nome' && (
            <button
              onClick={() => setKeyboard('nome')}
              style={{
                width: '100%', padding: '30px', borderRadius: '18px', cursor: 'pointer', textAlign: 'center',
                background: `${primary}10`, border: `1px solid ${primary}25`,
              }}
            >
              <span style={{
                color: nomeCliente ? accent : `${text}20`,
                fontSize: '32px', fontWeight: 'bold',
              }}>
                {nomeCliente || 'Toque aqui'}
              </span>
            </button>
          )}

          {modoChamada === 'ambos' && (
            <div style={{ display: 'flex', gap: '14px', width: '100%' }}>
              <button
                onClick={() => setKeyboard('pager')}
                style={{
                  flex: 1, padding: '24px', borderRadius: '18px', cursor: 'pointer', textAlign: 'center',
                  background: `${primary}10`, border: `1px solid ${primary}25`,
                }}
              >
                <span style={{ color: text, opacity: 0.5, fontSize: '14px', display: 'block', marginBottom: '8px' }}>Pager</span>
                <span style={{
                  color: numeroPager ? accent : `${text}20`,
                  fontSize: '36px', fontWeight: 'bold', letterSpacing: '8px', fontFamily: 'monospace',
                }}>
                  {numeroPager || '_ _ _'}
                </span>
              </button>
              <button
                onClick={() => setKeyboard('nome')}
                style={{
                  flex: 1, padding: '24px', borderRadius: '18px', cursor: 'pointer', textAlign: 'center',
                  background: `${primary}10`, border: `1px solid ${primary}25`,
                }}
              >
                <span style={{ color: text, opacity: 0.5, fontSize: '14px', display: 'block', marginBottom: '8px' }}>Nome</span>
                <span style={{
                  color: nomeCliente ? accent : `${text}20`,
                  fontSize: '24px', fontWeight: 'bold',
                }}>
                  {nomeCliente || 'Toque aqui'}
                </span>
              </button>
            </div>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Botao finalizar — abre modal de pagamento */}
          <button
            onClick={() => {
              const pagerOk = numeroPager.trim().length > 0;
              const nomeOk = nomeCliente.trim().length > 0;
              const ok =
                modoChamada === 'pager' ? pagerOk :
                modoChamada === 'nome' ? nomeOk :
                pagerOk || nomeOk;
              if (!ok) {
                // Abrir o teclado correto pra preencher
                if (modoChamada === 'pager' || modoChamada === 'ambos') setKeyboard('pager');
                else setKeyboard('nome');
                return;
              }
              setKeyboard('pagamento' as KeyboardMode);
            }}
            style={{
              width: '100%', padding: '22px', borderRadius: '14px', border: 'none',
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              color: text, fontSize: '22px', fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: `0 4px 25px ${primary}50`,
            }}
          >
            Finalizar Pedido — R$ {totalPrice.toFixed(2).replace('.', ',')}
          </button>
        </div>
      </div>

      {/* =============================================
          OVERLAYS DE TECLADO
          ============================================= */}
      {keyboard && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '30px',
          }}
        >
          <div style={{ maxWidth: keyboard === 'pagamento' ? '550px' : '500px', width: '100%', margin: '0 auto' }}>
            {/* Botao confirmar — so nos teclados, nao no pagamento */}
            {keyboard !== 'pagamento' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button
                onClick={() => setKeyboard(null)}
                style={{
                  padding: '12px 28px', borderRadius: '12px', border: 'none',
                  background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                  color: text, fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
                }}
              >
                Confirmar
              </button>
            </div>
            )}

            {keyboard === 'pager' && (
              <NumericKeypad
                value={numeroPager}
                onChange={setNumeroPager}
                maxLength={4}
                placeholder="00"
                label="Digite o numero do Pager"
              />
            )}

            {keyboard === 'nome' && (
              <ScreenKeyboard
                value={nomeCliente}
                onChange={setNomeCliente}
                maxLength={50}
                placeholder="Seu nome..."
                label="Digite seu nome"
              />
            )}

            {keyboard === 'observacao' && (
              <ScreenKeyboard
                value={observacao}
                onChange={setObservacao}
                maxLength={200}
                placeholder="Ex: Sem cebola..."
                label="Observacao do pedido"
                multiline
              />
            )}

            {keyboard === 'pagamento' && (
              <div>
                <h2 style={{ color: text, fontSize: '28px', fontWeight: 'bold', textAlign: 'center', marginBottom: '30px' }}>
                  Selecione o metodo de pagamento
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', maxWidth: '440px', margin: '0 auto' }}>
                  {([
                    { id: 'dinheiro', label: 'Dinheiro', sub: 'Pague no balcao', color: '#10B981',
                      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '40px', height: '40px' }}><path d="M12 7.5a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" /><path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 16.125V4.875ZM8.25 9.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM18.75 9a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V9.75a.75.75 0 0 0-.75-.75h-.008ZM4.5 9.75A.75.75 0 0 1 5.25 9h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H5.25a.75.75 0 0 1-.75-.75V9.75Z" clipRule="evenodd" /></svg> },
                    { id: 'credito', label: 'Credito', sub: 'Cartao de credito', color: '#3B82F6',
                      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '40px', height: '40px' }}><path fillRule="evenodd" d="M1.5 4.125c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v2.042a.75.75 0 0 1 0 .154v8.554c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 14.875V6.321a.75.75 0 0 1 0-.154V4.125ZM3 6.462v8.413a.375.375 0 0 0 .375.375h17.25a.375.375 0 0 0 .375-.375V6.462a.375.375 0 0 0-.375-.337H3.375A.375.375 0 0 0 3 6.462Z" clipRule="evenodd" /></svg> },
                    { id: 'debito', label: 'Debito', sub: 'Cartao de debito', color: '#F59E0B',
                      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '40px', height: '40px' }}><path fillRule="evenodd" d="M1.5 4.125c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v2.042a.75.75 0 0 1 0 .154v8.554c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 14.875V6.321a.75.75 0 0 1 0-.154V4.125ZM3 6.462v8.413a.375.375 0 0 0 .375.375h17.25a.375.375 0 0 0 .375-.375V6.462a.375.375 0 0 0-.375-.337H3.375A.375.375 0 0 0 3 6.462Z" clipRule="evenodd" /></svg> },
                    { id: 'voucher', label: 'Voucher', sub: 'Vale refeicao', color: '#8B5CF6',
                      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '40px', height: '40px' }}><path fillRule="evenodd" d="M1.5 6.375c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v3.026a.75.75 0 0 1-.375.65 2.249 2.249 0 0 0 0 3.898.75.75 0 0 1 .375.65v3.026c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 17.625v-3.026a.75.75 0 0 1 .374-.65 2.249 2.249 0 0 0 0-3.898.75.75 0 0 1-.374-.65V6.375Z" clipRule="evenodd" /></svg> },
                  ]).filter((pag) => metodosPagamento.includes(pag.id)).map((pag) => (
                    <button
                      key={pag.id}
                      onClick={() => handlePagamento(pag.id as typeof tipoPagamento)}
                      style={{
                        padding: '28px 16px', borderRadius: '18px', cursor: 'pointer', textAlign: 'center',
                        background: `${pag.color}12`, border: `2px solid ${pag.color}40`,
                        transition: 'all 0.2s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${pag.color}25`;
                        e.currentTarget.style.borderColor = pag.color;
                        e.currentTarget.style.transform = 'scale(1.03)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `${pag.color}12`;
                        e.currentTarget.style.borderColor = `${pag.color}40`;
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <div style={{ color: pag.color }}>{pag.icon}</div>
                      <div style={{ color: text, fontSize: '20px', fontWeight: 'bold' }}>{pag.label}</div>
                      <div style={{ color: text, opacity: 0.4, fontSize: '13px' }}>{pag.sub}</div>
                    </button>
                  ))}
                </div>

                {/* Total */}
                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                  <span style={{ color: accent, fontSize: '36px', fontWeight: 'bold' }}>
                    R$ {totalPrice.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {/* Cancelar */}
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button
                    onClick={() => setKeyboard(null)}
                    style={{
                      padding: '12px 30px', borderRadius: '10px', border: `1px solid ${text}20`,
                      background: 'transparent', color: text, opacity: 0.5,
                      fontSize: '15px', cursor: 'pointer',
                    }}
                  >
                    Voltar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =============================================
          OVERLAY TEF — Aguardando / Negado
          ============================================= */}
      {tefStatus && tefStatus !== 'aprovado' && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            padding: '40px',
          }}
        >
          {tefStatus === 'aguardando' && (
            <div style={{ textAlign: 'center' }}>
              {/* Animacao pulsante */}
              <div style={{
                width: '140px', height: '140px', borderRadius: '50%',
                background: `${primary}20`, border: `3px solid ${primary}60`,
                display: 'grid', placeItems: 'center', margin: '0 auto 40px',
                animation: 'tefPulse 2s ease-in-out infinite',
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={primary} style={{ width: '70px', height: '70px' }}>
                  <path fillRule="evenodd" d="M1.5 4.125c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v2.042a.75.75 0 0 1 0 .154v8.554c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 14.875V6.321a.75.75 0 0 1 0-.154V4.125ZM3 6.462v8.413a.375.375 0 0 0 .375.375h17.25a.375.375 0 0 0 .375-.375V6.462a.375.375 0 0 0-.375-.337H3.375A.375.375 0 0 0 3 6.462Z" clipRule="evenodd" />
                </svg>
              </div>

              <h2 style={{ color: text, fontSize: '32px', fontWeight: 'bold', margin: '0 0 16px' }}>
                Aguardando pagamento...
              </h2>
              <p style={{ color: text, opacity: 0.5, fontSize: '18px', margin: '0 0 8px' }}>
                {tefMensagem}
              </p>
              <p style={{ color: accent, fontSize: '42px', fontWeight: 'bold', margin: '20px 0 0' }}>
                R$ {totalPrice.toFixed(2).replace('.', ',')}
              </p>

              {/* Cancelar */}
              <button
                onClick={() => setTefStatus(null)}
                style={{
                  marginTop: '40px', padding: '14px 40px', borderRadius: '12px',
                  border: `1px solid ${text}20`, background: 'transparent',
                  color: text, opacity: 0.4, fontSize: '16px', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <style>{`
                @keyframes tefPulse {
                  0%, 100% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.08); opacity: 0.7; }
                }
              `}</style>
            </div>
          )}

          {(tefStatus === 'negado' || tefStatus === 'erro') && (
            <div style={{ textAlign: 'center' }}>
              {/* Icone X */}
              <div style={{
                width: '120px', height: '120px', borderRadius: '50%',
                background: '#EF444420', display: 'grid', placeItems: 'center',
                margin: '0 auto 30px',
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#EF4444" style={{ width: '60px', height: '60px' }}>
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                </svg>
              </div>

              <h2 style={{ color: '#EF4444', fontSize: '28px', fontWeight: 'bold', margin: '0 0 12px' }}>
                Pagamento nao aprovado
              </h2>
              <p style={{ color: text, opacity: 0.5, fontSize: '16px', margin: '0 0 30px' }}>
                {tefMensagem}
              </p>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button
                  onClick={handleTentarNovamente}
                  style={{
                    padding: '18px 40px', borderRadius: '14px', border: 'none',
                    background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                    color: text, fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
                    boxShadow: `0 4px 20px ${primary}40`,
                  }}
                >
                  Tentar novamente
                </button>
                <button
                  onClick={() => { setTefStatus(null); setKeyboard('pagamento' as KeyboardMode); }}
                  style={{
                    padding: '18px 30px', borderRadius: '14px',
                    border: `1px solid ${text}20`, background: 'transparent',
                    color: text, opacity: 0.6, fontSize: '16px', cursor: 'pointer',
                  }}
                >
                  Trocar metodo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================
// Componente de sucesso com auto-redirect
// =============================================
function SuccessScreen({ pedido, bg, text, accent, numeroPager, nomeCliente, navigate }: {
  pedido: { numero_pedido: string; codigo_comanda: string };
  bg: string; text: string; accent: string;
  numeroPager: string; nomeCliente: string;
  navigate: (path: string) => void;
}) {
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bg, display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        {/* Check icon */}
        <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#10B98120', display: 'grid', placeItems: 'center', margin: '0 auto 30px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10B981" style={{ width: '60px', height: '60px' }}>
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
          </svg>
        </div>

        <h1 style={{ color: text, fontSize: '42px', fontWeight: 'bold', margin: '0 0 30px' }}>
          Pedido Realizado!
        </h1>

        {/* Pager ou nome */}
        {numeroPager && (
          <div style={{ padding: '20px 40px', borderRadius: '16px', background: `${accent}15`, border: `1px solid ${accent}30`, marginBottom: '16px', display: 'inline-block' }}>
            <p style={{ color: text, opacity: 0.5, fontSize: '14px', margin: '0 0 6px' }}>Pager</p>
            <p style={{ color: accent, fontSize: '56px', fontWeight: 'bold', margin: 0, letterSpacing: '8px' }}>{numeroPager}</p>
          </div>
        )}

        {nomeCliente && (
          <p style={{ color: text, fontSize: '24px', margin: '0 0 16px' }}>
            {nomeCliente}
          </p>
        )}

        <p style={{ color: text, opacity: 0.3, fontSize: '14px', margin: '20px 0 0' }}>
          {pedido.numero_pedido}
        </p>

        <p style={{ color: text, opacity: 0.3, fontSize: '14px', marginTop: '30px' }}>
          Voltando ao cardapio em {countdown}s...
        </p>
      </div>
    </div>
  );
}
