-- =============================================
-- XRA AutoPay Pedidos - Tabelas do sistema
-- TODAS as tabelas possuem tenant_id (multi-tenant)
-- Prefixo "ap_" para nao conflitar com tabelas existentes
-- =============================================

-- =============================================
-- CATEGORIAS
-- =============================================
CREATE TABLE IF NOT EXISTS ap_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES ap_tenants(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  imagem TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRODUTOS
-- =============================================
CREATE TABLE IF NOT EXISTS ap_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES ap_tenants(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES ap_categorias(id) ON DELETE SET NULL,
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL,
  imagem TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  destaque BOOLEAN DEFAULT FALSE,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADICIONAIS (ex: bacon, queijo extra, molho)
-- =============================================
CREATE TABLE IF NOT EXISTS ap_adicionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES ap_tenants(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  ordem INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PEDIDOS
-- =============================================
CREATE TABLE IF NOT EXISTS ap_pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES ap_tenants(id) ON DELETE CASCADE,
  numero_pedido VARCHAR(20) NOT NULL,              -- formato: #YYYYMMDD-100, 101, 102...
  codigo_comanda VARCHAR(10),                      -- codigo curto: "A4B7X2"
  nome_cliente VARCHAR(200),
  status VARCHAR(20) DEFAULT 'novo',               -- novo, preparando, pronto, entregue, cancelado
  tipo_pagamento VARCHAR(20) DEFAULT 'dinheiro',   -- dinheiro, cartao
  subtotal NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  observacao TEXT,

  -- TEF (preenchido quando paga na maquininha Stone)
  tef_nsu VARCHAR(50),
  tef_atk VARCHAR(100),
  tef_bandeira VARCHAR(50),
  tef_autorizacao VARCHAR(50),
  tef_cartao_masked VARCHAR(30),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ITENS DO PEDIDO
-- =============================================
CREATE TABLE IF NOT EXISTS ap_itens_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES ap_tenants(id) ON DELETE CASCADE,
  pedido_id UUID NOT NULL REFERENCES ap_pedidos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES ap_produtos(id) ON DELETE SET NULL,
  nome_produto VARCHAR(200) NOT NULL,              -- snapshot do nome (caso produto mude depois)
  quantidade INTEGER DEFAULT 1,
  preco_unitario NUMERIC(10,2) NOT NULL,
  preco_total NUMERIC(10,2) NOT NULL,
  adicionais JSONB DEFAULT '[]',                   -- [{nome: "Bacon", preco: 3.00}]
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USUARIOS (admin e vendedor de cada tenant)
-- =============================================
CREATE TABLE IF NOT EXISTS ap_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES ap_tenants(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  usuario VARCHAR(100) NOT NULL,
  senha_hash TEXT NOT NULL,                        -- bcrypt
  tipo VARCHAR(20) DEFAULT 'vendedor',             -- admin, vendedor
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, usuario)                       -- usuario unico por tenant
);

-- =============================================
-- TRANSACOES TEF (log de cada transacao Stone)
-- =============================================
CREATE TABLE IF NOT EXISTS ap_transacoes_tef (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES ap_tenants(id) ON DELETE CASCADE,
  pedido_id UUID REFERENCES ap_pedidos(id) ON DELETE SET NULL,
  stone_code VARCHAR(20),
  valor NUMERIC(10,2) NOT NULL,
  tipo VARCHAR(20),                                -- credito, debito, voucher
  status VARCHAR(20),                              -- approved, denied, error, timeout
  bandeira VARCHAR(50),
  nsu VARCHAR(50),
  atk VARCHAR(100),
  codigo_autorizacao VARCHAR(50),
  cartao_masked VARCHAR(30),
  erro_codigo VARCHAR(20),
  erro_mensagem TEXT,
  response_raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES (performance)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_ap_categorias_tenant ON ap_categorias(tenant_id, ordem);
CREATE INDEX IF NOT EXISTS idx_ap_produtos_tenant ON ap_produtos(tenant_id, ativo);
CREATE INDEX IF NOT EXISTS idx_ap_produtos_categoria ON ap_produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_ap_adicionais_tenant ON ap_adicionais(tenant_id, ativo);
CREATE INDEX IF NOT EXISTS idx_ap_pedidos_tenant ON ap_pedidos(tenant_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_ap_pedidos_numero ON ap_pedidos(tenant_id, numero_pedido);
CREATE INDEX IF NOT EXISTS idx_ap_itens_pedido ON ap_itens_pedido(tenant_id, pedido_id);
CREATE INDEX IF NOT EXISTS idx_ap_usuarios_tenant ON ap_usuarios(tenant_id, usuario);
CREATE INDEX IF NOT EXISTS idx_ap_transacoes_tef ON ap_transacoes_tef(tenant_id, created_at);
