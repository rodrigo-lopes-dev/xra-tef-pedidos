import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import DashboardPage from './DashboardPage';
import ProductsPage from './ProductsPage';
import CategoriesPage from './CategoriesPage';
import ExtrasPage from './ExtrasPage';
import SettingsPage from './SettingsPage';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'products', label: 'Produtos' },
  { id: 'categories', label: 'Categorias' },
  { id: 'extras', label: 'Adicionais' },
  { id: 'settings', label: 'Configuracoes' },
];

export default function AdminLayout() {
  const { tenant } = useTenant();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  const primary = tenant?.cor_primaria || '#3B82F6';
  const secondary = tenant?.cor_secundaria || '#1E40AF';
  const bg = tenant?.cor_fundo || '#0F172A';
  const text = tenant?.cor_texto || '#FFFFFF';

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
            Painel Administrativo
          </h1>
          <p style={{ color: text, opacity: 0.5, fontSize: '13px', margin: 0 }}>
            {tenant?.nome}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/modulos')}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: `1px solid ${text}20`,
              background: 'transparent', color: text, fontSize: '14px', fontWeight: '600',
              cursor: 'pointer', opacity: 0.6,
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

      {/* Tabs */}
      <div
        style={{
          display: 'flex', gap: '4px', padding: '12px 24px',
          borderBottom: `1px solid ${primary}20`, flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 24px', borderRadius: '10px', border: 'none',
              cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
              whiteSpace: 'nowrap',
              background: activeTab === tab.id ? `${primary}` : 'transparent',
              color: activeTab === tab.id ? '#FFFFFF' : text,
              opacity: activeTab === tab.id ? 1 : 0.5,
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'products' && <ProductsPage />}
        {activeTab === 'categories' && <CategoriesPage />}
        {activeTab === 'extras' && <ExtrasPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </div>
    </div>
  );
}
