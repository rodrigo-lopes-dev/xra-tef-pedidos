const API_BASE = '/api';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Fetch wrapper com JWT automatico.
 * Todas as chamadas passam por aqui.
 */
export async function api<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((customHeaders as Record<string, string>) || {}),
  };

  // Adicionar JWT se logado
  if (!skipAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Em dev, envia slug do tenant via header (proxy do Vite)
  const tenantSlug = localStorage.getItem('tenant_slug');
  if (tenantSlug) {
    headers['X-Tenant-Slug'] = tenantSlug;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    ...rest,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || `Erro ${response.status}`);
  }

  return response.json();
}
