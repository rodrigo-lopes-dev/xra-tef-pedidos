import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { io, Socket } from 'socket.io-client';

interface Pedido {
  id: string;
  numero_pedido: string;
  codigo_comanda: string;
  numero_pager: string | null;
  nome_cliente: string | null;
  status: string;
  tipo_pagamento: string;
  total: number;
  observacao: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  preparando: { label: 'Preparando', color: '#F59E0B' },
  pronto: { label: 'Prontos', color: '#10B981' },
  entregue: { label: 'Entregues', color: '#6B7280' },
};

const STATUS_FLOW: Record<string, string> = {
  preparando: 'pronto',
  pronto: 'entregue',
};

const STATUS_ACTION: Record<string, string> = {
  preparando: 'Pronto',
  pronto: 'Entregar',
};

export default function VendedorPage() {
  const { tenant } = useTenant();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  const primary = tenant?.cor_primaria || '#3B82F6';
  const secondary = tenant?.cor_secundaria || '#1E40AF';
  const bg = tenant?.cor_fundo || '#0F172A';
  const text = tenant?.cor_texto || '#FFFFFF';
  const accent = tenant?.cor_destaque || '#60A5FA';

  const fetchPedidos = useCallback(async () => {
    try {
      const data = await api<Pedido[]>('/admin/orders?status=preparando,pronto,entregue&limit=100');
      setPedidos(data);
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  // Socket.IO — tempo real
  useEffect(() => {
    if (!tenant) return;

    const s = io({ query: { tenantId: (tenant as any).id || '' } });
    setSocket(s);

    s.on('novo_pedido', (pedido: Pedido) => {
      setPedidos((prev) => [pedido, ...prev]);
    });

    s.on('pedido_atualizado', (updated: Pedido) => {
      setPedidos((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
      );
    });

    return () => { s.disconnect(); };
  }, [tenant]);

  async function mudarStatus(pedidoId: string, novoStatus: string) {
    // Atualiza local imediatamente (otimista)
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, status: novoStatus } : p))
    );
    try {
      await api(`/admin/orders/${pedidoId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: novoStatus }),
      });
    } catch (err: any) {
      // Reverte se falhou
      fetchPedidos();
      alert(err.message || 'Erro ao atualizar status');
    }
  }

  function formatHora(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const colunas = ['preparando', 'pronto', 'entregue'];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: bg, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: '50px', height: '50px', border: `4px solid ${primary}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', backgroundColor: bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <header
        style={{
          padding: '14px 24px',
          background: `linear-gradient(135deg, ${secondary}, ${primary}90)`,
          borderBottom: `1px solid ${primary}30`,
          display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0,
        }}
      >
        <div style={{ flex: 1 }}>
          <h1 style={{ color: text, fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
            Painel da Cozinha
          </h1>
          <p style={{ color: text, opacity: 0.5, fontSize: '13px', margin: 0 }}>
            {tenant?.nome} — {user?.nome}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/modulos')}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: `1px solid ${text}20`,
              background: 'transparent', color: text, fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              opacity: 0.6,
            }}
          >
            Voltar
          </button>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{
              padding: '10px 16px', borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)', color: '#F87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* Colunas de pedidos */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: '1px', background: `${primary}15` }}>
        {colunas.map((status) => {
          const config = STATUS_CONFIG[status];
          const pedidosColuna = pedidos.filter((p) => p.status === status);
          const nextStatus = STATUS_FLOW[status];
          const actionLabel = STATUS_ACTION[status];

          return (
            <div
              key={status}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                backgroundColor: bg, overflow: 'hidden',
              }}
            >
              {/* Header da coluna */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: `3px solid ${config.color}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}` }} />
                  <span style={{ color: text, fontSize: '18px', fontWeight: 'bold' }}>{config.label}</span>
                </div>
                <span
                  style={{
                    backgroundColor: `${config.color}20`, color: config.color,
                    padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold',
                  }}
                >
                  {pedidosColuna.length}
                </span>
              </div>

              {/* Cards dos pedidos */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                {pedidosColuna.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.2 }}>
                    <p style={{ color: text, fontSize: '14px' }}>Sem pedidos</p>
                  </div>
                )}

                {pedidosColuna.map((pedido) => (
                  <div
                    key={pedido.id}
                    style={{
                      padding: '18px',
                      borderRadius: '16px',
                      background: `${config.color}08`,
                      border: `1px solid ${config.color}20`,
                      marginBottom: '10px',
                    }}
                  >
                    {/* Numero + hora */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ color: config.color, fontSize: '16px', fontWeight: 'bold' }}>
                        {pedido.numero_pedido}
                      </span>
                      <span style={{ color: text, opacity: 0.4, fontSize: '13px' }}>
                        {formatHora(pedido.created_at)}
                      </span>
                    </div>

                    {/* Pager / Nome */}
                    {(pedido.numero_pager || pedido.nome_cliente) && (
                      <div style={{ marginBottom: '10px' }}>
                        {pedido.numero_pager && (
                          <span style={{ color: accent, fontSize: '24px', fontWeight: 'bold', letterSpacing: '3px', fontFamily: 'monospace' }}>
                            Pager {pedido.numero_pager}
                          </span>
                        )}
                        {pedido.nome_cliente && (
                          <span style={{ color: text, fontSize: '18px', fontWeight: 'bold', display: 'block' }}>
                            {pedido.nome_cliente}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Total + pagamento */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: accent, fontSize: '18px', fontWeight: 'bold' }}>
                        R$ {Number(pedido.total).toFixed(2).replace('.', ',')}
                      </span>
                      <span style={{ color: text, opacity: 0.4, fontSize: '12px', textTransform: 'uppercase' }}>
                        {pedido.tipo_pagamento}
                      </span>
                    </div>

                    {/* Observacao */}
                    {pedido.observacao && (
                      <p style={{ color: text, opacity: 0.5, fontSize: '13px', fontStyle: 'italic', margin: '0 0 12px' }}>
                        Obs: {pedido.observacao}
                      </p>
                    )}

                    {/* Botao de acao */}
                    {nextStatus && (
                      <button
                        onClick={() => mudarStatus(pedido.id, nextStatus)}
                        style={{
                          width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                          background: config.color, color: '#FFFFFF',
                          fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                      >
                        {actionLabel}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
