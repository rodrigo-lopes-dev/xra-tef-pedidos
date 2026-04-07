import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useCart } from '../../contexts/CartContext';
import { api } from '../../services/api';
import '../../utils/kioskMode';
import ProductModal from '../../components/ProductModal';

interface Categoria {
  id: string;
  nome: string;
  imagem: string | null;
  ordem: number;
}

interface Produto {
  id: string;
  categoria_id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem: string | null;
  destaque: boolean;
  ordem: number;
}

export default function HomePage() {
  const { tenant } = useTenant();
  const { totalItems, totalPrice } = useCart();
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const primary = tenant?.cor_primaria || '#3B82F6';
  const secondary = tenant?.cor_secundaria || '#1E40AF';
  const bg = tenant?.cor_fundo || '#0F172A';
  const text = tenant?.cor_texto || '#FFFFFF';
  const accent = tenant?.cor_destaque || '#60A5FA';

  useEffect(() => {
    Promise.all([
      api<Categoria[]>('/categories', { skipAuth: true }),
      api<Produto[]>('/products', { skipAuth: true }),
    ])
      .then(([cats, prods]) => {
        setCategorias(cats);
        setProdutos(prods);
      })
      .finally(() => setLoading(false));
  }, []);

  const produtosFiltrados = categoriaSelecionada
    ? produtos.filter((p) => p.categoria_id === categoriaSelecionada)
    : produtos;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', backgroundColor: bg }}>
        <div
          style={{
            width: '50px',
            height: '50px',
            border: `4px solid ${primary}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bg, position: 'relative', overflow: 'hidden' }}>
      {/* Background glow */}
      <div
        style={{
          position: 'fixed',
          top: '-100px',
          right: '-50px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          backgroundColor: primary,
          filter: 'blur(120px)',
          opacity: 0.1,
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          padding: '20px 30px',
          background: `linear-gradient(135deg, ${secondary}, ${primary}90)`,
          borderBottom: `1px solid ${primary}30`,
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {tenant?.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={tenant.nome}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              objectFit: 'cover',
              boxShadow: `0 0 20px ${primary}50`,
            }}
          />
        ) : (
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              color: text,
              display: 'grid',
              placeItems: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
            }}
          >
            {tenant?.nome?.charAt(0)}
          </div>
        )}
        <div>
          <h1 style={{ color: text, fontSize: '22px', fontWeight: 'bold', margin: 0 }}>
            {tenant?.nome}
          </h1>
          <p style={{ color: text, opacity: 0.7, fontSize: '13px', margin: 0 }}>
            {tenant?.mensagem_boas_vindas}
          </p>
        </div>
      </header>

      {/* Banner */}
      <div
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          background: `linear-gradient(180deg, ${primary}20, transparent)`,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '16px 50px',
            borderRadius: '16px',
            fontSize: '28px',
            fontWeight: 'bold',
            color: text,
            background: `linear-gradient(135deg, ${primary}25, ${secondary}25)`,
            border: `1px solid ${primary}40`,
            boxShadow: `0 0 40px ${primary}20`,
            letterSpacing: '1px',
          }}
        >
          FACA SEU PEDIDO AQUI!
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 30px 60px' }}>
        {/* Categorias */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${categorias.length + (tenant?.mostrar_todos !== false ? 1 : 0)}, 1fr)`,
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          {tenant?.mostrar_todos !== false && (
            <button
              onClick={() => setCategoriaSelecionada(null)}
              style={{
                padding: '20px 16px',
                borderRadius: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: text,
                background: !categoriaSelecionada
                  ? `linear-gradient(135deg, ${primary}, ${secondary})`
                  : `${primary}15`,
                border: `1px solid ${!categoriaSelecionada ? primary : primary + '30'}`,
                boxShadow: !categoriaSelecionada ? `0 0 25px ${primary}40` : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              Todos
            </button>
          )}
          {categorias.map((cat) => {
            const isActive = categoriaSelecionada === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaSelecionada(cat.id)}
                style={{
                  padding: cat.imagem ? '0' : '20px 16px',
                  borderRadius: '16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  color: text,
                  background: isActive
                    ? `linear-gradient(135deg, ${primary}, ${secondary})`
                    : `${primary}15`,
                  border: `1px solid ${isActive ? primary : primary + '30'}`,
                  boxShadow: isActive ? `0 0 25px ${primary}40` : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {cat.imagem && (
                  <img
                    src={cat.imagem}
                    alt={cat.nome}
                    style={{ width: '100%', height: '80px', objectFit: 'cover' }}
                  />
                )}
                <div style={{ padding: '12px', fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {cat.nome}
                </div>
              </button>
            );
          })}
        </div>

        {/* Produtos */}
        {produtosFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', opacity: 0.4 }}>
            <p style={{ color: text, fontSize: '20px' }}>Nenhum produto encontrado</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '24px',
            }}
          >
            {produtosFiltrados.map((produto) => (
              <div
                key={produto.id}
                onClick={() => setProdutoSelecionado(produto)}
                style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: `${primary}10`,
                  border: `1px solid ${primary}25`,
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 15px 40px ${primary}20`;
                  e.currentTarget.style.borderColor = `${primary}50`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = `${primary}25`;
                }}
              >
                {/* Imagem do produto */}
                {produto.imagem ? (
                  <img
                    src={produto.imagem}
                    alt={produto.nome}
                    style={{ width: '100%', height: '220px', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '220px',
                      display: 'grid',
                      placeItems: 'center',
                      backgroundColor: `${primary}10`,
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={0.8}
                      stroke={text}
                      style={{ width: '80px', height: '80px', opacity: 0.15 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 0 0 2.25-2.25V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                  </div>
                )}

                {/* Info do produto */}
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h3 style={{ color: text, fontSize: '22px', fontWeight: 'bold', margin: 0 }}>
                      {produto.nome}
                    </h3>
                    {produto.destaque && (
                      <span
                        style={{
                          backgroundColor: `${accent}25`,
                          color: accent,
                          border: `1px solid ${accent}50`,
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Destaque
                      </span>
                    )}
                  </div>

                  {produto.descricao && (
                    <p style={{ color: text, opacity: 0.5, fontSize: '14px', margin: '0 0 20px', lineHeight: '1.5' }}>
                      {produto.descricao}
                    </p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: accent, fontSize: '28px', fontWeight: 'bold' }}>
                      R$ {Number(produto.preco).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal do produto */}
      {produtoSelecionado && (
        <ProductModal
          produto={produtoSelecionado}
          onClose={() => setProdutoSelecionado(null)}
        />
      )}

      {/* Botao flutuante do carrinho */}
      {totalItems > 0 && (
        <button
          onClick={() => navigate('/cart')}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            zIndex: 40,
            padding: '18px 32px',
            borderRadius: '20px',
            border: 'none',
            background: `linear-gradient(135deg, ${primary}, ${secondary})`,
            color: text,
            fontSize: '17px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: `0 8px 40px ${primary}60`,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '24px', height: '24px' }}>
            <path d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 0 0-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 0 0 0-1.5H5.378A2.25 2.25 0 0 1 7.5 15h11.218a.75.75 0 0 0 .674-.421 60.358 60.358 0 0 0 2.96-7.228.75.75 0 0 0-.525-.965A60.864 60.864 0 0 0 5.68 4.509l-.232-.867A1.875 1.875 0 0 0 3.636 2.25H2.25ZM3.75 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM16.5 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
          </svg>
          <span>{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
          <span style={{ opacity: 0.7 }}>|</span>
          <span>R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
        </button>
      )}
    </div>
  );
}
