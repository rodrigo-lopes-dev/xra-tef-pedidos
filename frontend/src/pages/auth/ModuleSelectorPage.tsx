import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

const modules = [
  {
    id: 'cliente',
    title: 'Area do Cliente',
    description: 'Interface de totem para realizacao de pedidos',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '36px', height: '36px' }}>
        <path d="M10.5 18.75a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" />
        <path fillRule="evenodd" d="M8.625.75A3.375 3.375 0 0 0 5.25 4.125v15.75a3.375 3.375 0 0 0 3.375 3.375h6.75a3.375 3.375 0 0 0 3.375-3.375V4.125A3.375 3.375 0 0 0 15.375.75h-6.75ZM7.5 4.125C7.5 3.504 8.004 3 8.625 3h6.75C15.996 3 16.5 3.504 16.5 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-6.75A1.125 1.125 0 0 1 7.5 19.875V4.125Z" clipRule="evenodd" />
      </svg>
    ),
    iconColor: '#3B82F6',
    path: '/',
    roles: ['admin', 'vendedor'],
  },
  {
    id: 'vendedor',
    title: 'Painel Vendedor',
    description: 'Gestao de pedidos e cozinha em tempo real',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '36px', height: '36px' }}>
        <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" />
        <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
      </svg>
    ),
    iconColor: '#F59E0B',
    path: '/vendedor',
    roles: ['admin', 'vendedor'],
  },
  {
    id: 'admin',
    title: 'Dashboard Admin',
    description: 'Relatorios, estatisticas e gestao completa',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '36px', height: '36px' }}>
        <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75ZM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 0 1-1.875-1.875V8.625ZM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 0 1 3 19.875v-6.75Z" />
      </svg>
    ),
    iconColor: '#10B981',
    path: '/admin',
    roles: ['admin'],
  },
];

export default function ModuleSelectorPage() {
  const { tenant } = useTenant();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const primary = tenant?.cor_primaria || '#3B82F6';
  const bg = tenant?.cor_fundo || '#0F172A';
  const text = tenant?.cor_texto || '#FFFFFF';
  const accent = tenant?.cor_destaque || '#60A5FA';

  const availableModules = modules.filter((m) =>
    m.roles.includes(user?.tipo || '')
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        backgroundColor: bg,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-150px',
          right: '-50px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          backgroundColor: primary,
          filter: 'blur(150px)',
          opacity: 0.15,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-150px',
          left: '-50px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          backgroundColor: accent,
          filter: 'blur(120px)',
          opacity: 0.1,
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '50px', position: 'relative', zIndex: 10 }}>
        <h1 style={{ color: text, fontSize: '40px', fontWeight: 'bold', marginBottom: '10px' }}>
          Selecione o Modulo
        </h1>
        <p style={{ color: text, opacity: 0.5, fontSize: '18px' }}>
          Escolha a area que deseja acessar
        </p>
      </div>

      {/* Cards dos modulos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${availableModules.length}, 1fr)`,
          gap: '30px',
          maxWidth: '1000px',
          width: '100%',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {availableModules.map((mod) => (
          <button
            key={mod.id}
            onClick={() => navigate(mod.path)}
            style={{
              padding: '50px 30px',
              borderRadius: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: `linear-gradient(135deg, ${primary}12, ${primary}08)`,
              border: `1px solid ${primary}35`,
              boxShadow: `0 0 30px ${primary}10`,
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
              e.currentTarget.style.boxShadow = `0 20px 60px ${primary}25`;
              e.currentTarget.style.borderColor = `${primary}60`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = `0 0 30px ${primary}10`;
              e.currentTarget.style.borderColor = `${primary}35`;
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                backgroundColor: mod.iconColor,
                boxShadow: `0 0 30px ${mod.iconColor}50`,
                color: '#FFFFFF',
                marginBottom: '24px',
                transition: 'transform 0.3s',
              }}
            >
              {mod.icon}
            </div>

            <h3 style={{ color: text, fontSize: '22px', fontWeight: 'bold', marginBottom: '10px' }}>
              {mod.title}
            </h3>
            <p style={{ color: text, opacity: 0.5, fontSize: '15px', marginBottom: '20px', lineHeight: '1.5' }}>
              {mod.description}
            </p>
            <span style={{ color: accent, fontSize: '16px', fontWeight: '600' }}>
              Acessar &rarr;
            </span>
          </button>
        ))}
      </div>

      {/* Footer com info do usuario */}
      <div
        style={{
          marginTop: '50px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <span style={{ color: text, opacity: 0.5, fontSize: '14px' }}>
          {user?.nome} ({user?.tipo}) &bull; {tenant?.nome}
        </span>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#F87171',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
          }}
        >
          Sair
        </button>
      </div>
    </div>
  );
}
