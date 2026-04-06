import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import LoginPage from './pages/auth/LoginPage';
import ModuleSelectorPage from './pages/auth/ModuleSelectorPage';
import HomePage from './pages/cliente/HomePage';
import CartPage from './pages/cliente/CartPage';
import VendedorPage from './pages/vendedor/VendedorPage';
import AdminLayout from './pages/admin/AdminLayout';

// Rota protegida: redireciona pro login se nao autenticado
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppContent() {
  const { loading, error } = useTenant();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--color-text)' }}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F172A' }}>
        <div className="text-center p-8">
          <h1 className="text-3xl font-bold text-white mb-4">Estabelecimento nao encontrado</h1>
          <p className="text-gray-400">Verifique o endereco e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Seletor de modulos (protegido) */}
      <Route path="/modulos" element={
        <ProtectedRoute><ModuleSelectorPage /></ProtectedRoute>
      } />

      {/* Area do cliente / totem (protegido) */}
      <Route path="/" element={
        <ProtectedRoute><HomePage /></ProtectedRoute>
      } />

      {/* Carrinho (protegido) */}
      <Route path="/cart" element={
        <ProtectedRoute><CartPage /></ProtectedRoute>
      } />

      {/* Painel cozinha / vendedor (protegido) */}
      <Route path="/vendedor" element={
        <ProtectedRoute><VendedorPage /></ProtectedRoute>
      } />

      {/* Painel admin (protegido) */}
      <Route path="/admin" element={
        <ProtectedRoute><AdminLayout /></ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TenantProvider>
        <AuthProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </AuthProvider>
      </TenantProvider>
    </BrowserRouter>
  );
}
