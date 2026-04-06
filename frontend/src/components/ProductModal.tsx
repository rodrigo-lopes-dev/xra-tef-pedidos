import { useEffect, useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useCart } from '../contexts/CartContext';
import { api } from '../services/api';

interface Adicional {
  id: string;
  nome: string;
  preco: number;
}

interface ProductModalProps {
  produto: {
    id: string;
    categoria_id: string;
    nome: string;
    descricao: string | null;
    preco: number;
    imagem: string | null;
  };
  onClose: () => void;
}

export default function ProductModal({ produto, onClose }: ProductModalProps) {
  const { tenant } = useTenant();
  const { addItem } = useCart();
  const [adicionais, setAdicionais] = useState<Adicional[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [loadingExtras, setLoadingExtras] = useState(true);

  const primary = tenant?.cor_primaria || '#3B82F6';
  const secondary = tenant?.cor_secundaria || '#1E40AF';
  const bg = tenant?.cor_fundo || '#0F172A';
  const text = tenant?.cor_texto || '#FFFFFF';
  const accent = tenant?.cor_destaque || '#60A5FA';

  useEffect(() => {
    api<Adicional[]>(`/extras?categoria_id=${produto.categoria_id}`, { skipAuth: true })
      .then(setAdicionais)
      .finally(() => setLoadingExtras(false));
  }, []);

  // Fechar com ESC
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function toggleAdicional(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const adicionaisSelecionados = adicionais.filter((a) => selecionados.has(a.id));
  const totalAdicionais = adicionaisSelecionados.reduce((sum, a) => sum + a.preco, 0);
  const totalItem = (produto.preco + totalAdicionais) * quantidade;

  function handleAdd() {
    addItem({
      produto_id: produto.id,
      nome: produto.nome,
      preco_unitario: produto.preco,
      quantidade,
      adicionais: adicionaisSelecionados.map((a) => ({ id: a.id, nome: a.nome, preco: a.preco })),
      observacao,
      imagem: produto.imagem,
    });
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'grid',
        placeItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '24px',
          background: bg,
          border: `1px solid ${primary}30`,
          boxShadow: `0 0 80px ${primary}20`,
        }}
      >
        {/* Imagem */}
        {produto.imagem ? (
          <img
            src={produto.imagem}
            alt={produto.nome}
            style={{ width: '100%', height: '250px', objectFit: 'cover', borderRadius: '24px 24px 0 0' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '200px',
              display: 'grid',
              placeItems: 'center',
              backgroundColor: `${primary}10`,
              borderRadius: '24px 24px 0 0',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={0.8}
              stroke={text}
              style={{ width: '60px', height: '60px', opacity: 0.15 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 0 0 2.25-2.25V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          </div>
        )}

        <div style={{ padding: '30px' }}>
          {/* Nome e preco */}
          <h2 style={{ color: text, fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px' }}>
            {produto.nome}
          </h2>
          {produto.descricao && (
            <p style={{ color: text, opacity: 0.5, fontSize: '15px', margin: '0 0 16px', lineHeight: '1.5' }}>
              {produto.descricao}
            </p>
          )}
          <p style={{ color: accent, fontSize: '26px', fontWeight: 'bold', margin: '0 0 30px' }}>
            R$ {produto.preco.toFixed(2).replace('.', ',')}
          </p>

          {/* Adicionais */}
          {!loadingExtras && adicionais.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ color: text, fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px' }}>
                Adicionais
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {adicionais.map((adic) => {
                  const selected = selecionados.has(adic.id);
                  return (
                    <button
                      key={adic.id}
                      onClick={() => toggleAdicional(adic.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 18px',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        background: selected ? `${primary}20` : `${primary}08`,
                        border: `1px solid ${selected ? primary : primary + '20'}`,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Checkbox visual */}
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            border: `2px solid ${selected ? primary : primary + '50'}`,
                            backgroundColor: selected ? primary : 'transparent',
                            display: 'grid',
                            placeItems: 'center',
                            transition: 'all 0.2s',
                          }}
                        >
                          {selected && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#fff" style={{ width: '14px', height: '14px' }}>
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span style={{ color: text, fontSize: '16px', fontWeight: selected ? '600' : '400' }}>
                          {adic.nome}
                        </span>
                      </div>
                      <span style={{ color: accent, fontSize: '15px', fontWeight: '600' }}>
                        + R$ {adic.preco.toFixed(2).replace('.', ',')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Observacao — so mostra se tem adicionais (produtos que aceitam customizacao) */}
          {adicionais.length > 0 && <div style={{ marginBottom: '28px' }}>
            <h3 style={{ color: text, fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px' }}>
              Observacao
            </h3>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Sem cebola, ponto da carne mal passado..."
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '14px',
                border: `1px solid ${primary}30`,
                backgroundColor: `${bg}CC`,
                color: text,
                fontSize: '15px',
                resize: 'vertical',
                minHeight: '80px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = `${primary}60`;
                e.target.style.boxShadow = `0 0 0 3px ${primary}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = `${primary}30`;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>}

          {/* Quantidade */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginBottom: '30px' }}>
            <button
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                border: `1px solid ${primary}40`,
                backgroundColor: `${primary}15`,
                color: text,
                fontSize: '24px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                transition: 'all 0.2s',
              }}
            >
              -
            </button>
            <span style={{ color: text, fontSize: '28px', fontWeight: 'bold', minWidth: '40px', textAlign: 'center' }}>
              {quantidade}
            </span>
            <button
              onClick={() => setQuantidade((q) => q + 1)}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                border: `1px solid ${primary}40`,
                backgroundColor: `${primary}15`,
                color: text,
                fontSize: '24px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                transition: 'all 0.2s',
              }}
            >
              +
            </button>
          </div>

          {/* Botao adicionar */}
          <button
            onClick={handleAdd}
            style={{
              width: '100%',
              padding: '18px',
              borderRadius: '16px',
              border: 'none',
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              color: text,
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: `0 4px 25px ${primary}50`,
              transition: 'all 0.2s ease',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>Adicionar ao pedido</span>
            <span>R$ {totalItem.toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
