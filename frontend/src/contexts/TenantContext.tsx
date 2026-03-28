import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../services/api';

interface TenantData {
  nome: string;
  slug: string;
  logo_url: string | null;
  favicon_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  cor_fundo: string;
  cor_texto: string;
  cor_destaque: string;
  maquininha_ativa: boolean;
  mensagem_boas_vindas: string;
  modo_chamada: 'pager' | 'nome' | 'ambos';
  modo_tela: 'monitor' | 'tablet';
  metodos_pagamento: string[];
  mostrar_todos: boolean;
}

interface TenantContextType {
  tenant: TenantData | null;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  loading: true,
  error: null,
});

export function useTenant() {
  return useContext(TenantContext);
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Em dev, extrair slug da URL ou usar default
    const hostname = window.location.hostname;
    let slug = hostname.split('.')[0];

    // localhost → usar slug salvo ou 'demo'
    if (slug === 'localhost' || slug === '127') {
      slug = localStorage.getItem('tenant_slug') || 'demo';
    }

    localStorage.setItem('tenant_slug', slug);

    api<TenantData>('/tenant/config', { skipAuth: true })
      .then((data) => {
        setTenant(data);

        // Aplicar CSS variables do tema
        const root = document.documentElement;
        root.style.setProperty('--color-primary', data.cor_primaria);
        root.style.setProperty('--color-secondary', data.cor_secundaria);
        root.style.setProperty('--color-background', data.cor_fundo);
        root.style.setProperty('--color-text', data.cor_texto);
        root.style.setProperty('--color-accent', data.cor_destaque);

        // Atualizar titulo da pagina
        document.title = data.nome;

        // Atualizar favicon se tiver
        if (data.favicon_url) {
          const link = document.querySelector("link[rel='icon']") as HTMLLinkElement
            || document.createElement('link');
          link.rel = 'icon';
          link.href = data.favicon_url;
          document.head.appendChild(link);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
}
