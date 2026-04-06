import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

export default function LoginPage() {
  const { tenant } = useTenant();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      await login(usuario, senha);
      navigate('/modulos');
    } catch (err: any) {
      setErro(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  const primary = tenant?.cor_primaria || '#3B82F6';
  const secondary = tenant?.cor_secundaria || '#1E40AF';
  const bg = tenant?.cor_fundo || '#0F172A';
  const text = tenant?.cor_texto || '#FFFFFF';
  const accent = tenant?.cor_destaque || '#60A5FA';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      {/* Background glow effects */}
      <div
        className="absolute rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{
          backgroundColor: primary,
          width: '500px',
          height: '500px',
          top: '-150px',
          left: '-100px',
        }}
      />
      <div
        className="absolute rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{
          backgroundColor: accent,
          width: '400px',
          height: '400px',
          bottom: '-150px',
          right: '-100px',
        }}
      />

      {/* Logo + Nome */}
      <div className="text-center relative z-10" style={{ marginBottom: '40px' }}>
        {tenant?.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={tenant.nome}
            className="rounded-full object-cover mx-auto"
            style={{
              width: '100px',
              height: '100px',
              marginBottom: '20px',
              boxShadow: `0 0 40px ${primary}66`,
            }}
          />
        ) : (
          <div
            style={{
              width: '100px',
              height: '100px',
              marginBottom: '20px',
              marginLeft: 'auto',
              marginRight: 'auto',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              color: text,
              fontSize: '36px',
              fontWeight: 'bold',
              boxShadow: `0 0 40px ${primary}66`,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {tenant?.nome?.charAt(0) || 'A'}
          </div>
        )}
        <h1
          style={{
            color: text,
            fontSize: '32px',
            fontWeight: 'bold',
            marginBottom: '6px',
          }}
        >
          {tenant?.nome}
        </h1>
        <p style={{ color: text, opacity: 0.6, fontSize: '14px' }}>
          Sistema Profissional de Gestao
        </p>
      </div>

      {/* Card de login */}
      <div
        className="relative z-10"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px',
          borderRadius: '20px',
          background: `linear-gradient(135deg, ${primary}15, ${secondary}15)`,
          border: `1px solid ${primary}40`,
          boxShadow: `0 0 60px ${primary}15`,
        }}
      >
        <h2
          style={{
            color: text,
            fontSize: '22px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '32px',
          }}
        >
          Acesso Restrito
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Campo Usuario */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                color: text,
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '10px',
              }}
            >
              Usuario
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Digite o usuario"
              required
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '12px',
                border: `1px solid ${primary}40`,
                backgroundColor: `${bg}CC`,
                color: text,
                fontSize: '16px',
                outline: 'none',
                transition: 'box-shadow 0.2s, border-color 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = `0 0 0 3px ${primary}40`;
                e.target.style.borderColor = `${primary}80`;
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none';
                e.target.style.borderColor = `${primary}40`;
              }}
            />
          </div>

          {/* Campo Senha */}
          <div style={{ marginBottom: '28px' }}>
            <label
              style={{
                display: 'block',
                color: text,
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '10px',
              }}
            >
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite a senha"
              required
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '12px',
                border: `1px solid ${primary}40`,
                backgroundColor: `${bg}CC`,
                color: text,
                fontSize: '16px',
                outline: 'none',
                transition: 'box-shadow 0.2s, border-color 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = `0 0 0 3px ${primary}40`;
                e.target.style.borderColor = `${primary}80`;
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none';
                e.target.style.borderColor = `${primary}40`;
              }}
            />
          </div>

          {/* Erro */}
          {erro && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#FCA5A5',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              {erro}
            </div>
          )}

          {/* Botao */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              color: text,
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'opacity 0.2s, transform 0.2s',
              boxShadow: `0 4px 25px ${primary}50`,
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p
        className="relative z-10"
        style={{
          color: text,
          opacity: 0.3,
          fontSize: '13px',
          marginTop: '40px',
        }}
      >
        Powered by XRA AutoPay
      </p>
    </div>
  );
}
