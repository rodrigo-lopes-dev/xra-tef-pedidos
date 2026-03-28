import { useEffect, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { api } from '../../services/api';

interface DashboardData {
  totalVendas: number;
  totalPedidos: number;
  porStatus: { preparando: number; pronto: number; entregue: number; cancelado: number };
  porPagamento: { dinheiro: number; credito: number; debito: number; voucher: number };
}

export default function DashboardPage() {
  const { tenant } = useTenant();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const primary = tenant?.cor_primaria || '#3B82F6';
  const text = tenant?.cor_texto || '#FFFFFF';
  const accent = tenant?.cor_destaque || '#60A5FA';

  useEffect(() => {
    api<DashboardData>('/admin/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: text, opacity: 0.5 }}>Carregando...</p>;
  if (!data) return <p style={{ color: text, opacity: 0.5 }}>Erro ao carregar</p>;

  const cards = [
    { label: 'Vendas Hoje', value: `R$ ${data.totalVendas.toFixed(2).replace('.', ',')}`, color: '#10B981' },
    { label: 'Pedidos Hoje', value: data.totalPedidos, color: '#3B82F6' },
    { label: 'Preparando', value: data.porStatus.preparando, color: '#F59E0B' },
    { label: 'Prontos', value: data.porStatus.pronto, color: '#10B981' },
    { label: 'Entregues', value: data.porStatus.entregue, color: '#6B7280' },
    { label: 'Cancelados', value: data.porStatus.cancelado, color: '#EF4444' },
  ];

  const pagamentos = [
    { label: 'Dinheiro', value: data.porPagamento.dinheiro, color: '#10B981' },
    { label: 'Credito', value: data.porPagamento.credito, color: '#3B82F6' },
    { label: 'Debito', value: data.porPagamento.debito, color: '#F59E0B' },
    { label: 'Voucher', value: data.porPagamento.voucher, color: '#8B5CF6' },
  ];

  return (
    <div style={{ maxWidth: '1000px' }}>
      <h2 style={{ color: text, fontSize: '24px', fontWeight: 'bold', margin: '0 0 24px' }}>
        Resumo do Dia
      </h2>

      {/* Cards principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '30px' }}>
        {cards.map((card) => (
          <div
            key={card.label}
            style={{
              padding: '24px', borderRadius: '16px',
              background: `${card.color}10`, border: `1px solid ${card.color}25`,
            }}
          >
            <p style={{ color: text, opacity: 0.5, fontSize: '14px', margin: '0 0 8px' }}>{card.label}</p>
            <p style={{ color: card.color, fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Pagamentos */}
      <h3 style={{ color: text, fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px' }}>
        Por forma de pagamento
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {pagamentos.map((p) => (
          <div
            key={p.label}
            style={{
              padding: '20px', borderRadius: '14px', textAlign: 'center',
              background: `${p.color}10`, border: `1px solid ${p.color}20`,
            }}
          >
            <p style={{ color: text, opacity: 0.5, fontSize: '13px', margin: '0 0 6px' }}>{p.label}</p>
            <p style={{ color: p.color, fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{p.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
