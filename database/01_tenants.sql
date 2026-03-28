-- =============================================
-- XRA AutoPay Pedidos - Tabela TENANTS
-- Cada tenant = 1 cliente (lanchonete, pizzaria, etc)
-- =============================================

CREATE TABLE IF NOT EXISTS ap_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(63) UNIQUE NOT NULL,              -- subdominio: "shakalaka", "burguerx"
  nome VARCHAR(255) NOT NULL,                    -- "Shaka Laka Lanches"

  -- Branding (cores que o frontend carrega via CSS variables)
  logo_url TEXT,
  favicon_url TEXT,
  cor_primaria VARCHAR(7) DEFAULT '#3B82F6',     -- botoes, links, destaque
  cor_secundaria VARCHAR(7) DEFAULT '#1E40AF',   -- hover, fundo secundario
  cor_fundo VARCHAR(7) DEFAULT '#0F172A',        -- fundo geral
  cor_texto VARCHAR(7) DEFAULT '#FFFFFF',        -- texto principal
  cor_destaque VARCHAR(7) DEFAULT '#60A5FA',     -- badges, preco, realce

  -- Dados do negocio
  cnpj VARCHAR(18),
  telefone VARCHAR(20),
  email VARCHAR(255),
  endereco TEXT,

  -- Impressora (config do PC local de cada loja)
  printer_name VARCHAR(100) DEFAULT '',          -- ex: "ELGIN i8", "Epson TM-T20X"
  printer_width INTEGER DEFAULT 42,              -- 42 chars = 80mm, 32 chars = 58mm

  -- TEF Stone
  stone_code VARCHAR(20) DEFAULT '',             -- Stonecode do cliente na Stone
  maquininha_ativa BOOLEAN DEFAULT FALSE,        -- habilita pagamento na maquininha

  -- Mensagens customizaveis
  mensagem_boas_vindas TEXT DEFAULT 'Bem-vindo! Faca seu pedido.',
  mensagem_rodape_comanda TEXT DEFAULT 'Obrigado pela preferencia!',

  -- Plano e status
  plano VARCHAR(20) DEFAULT 'basico',            -- basico, pro, enterprise
  status VARCHAR(20) DEFAULT 'ativo',            -- ativo, suspenso, trial
  max_pedidos_mes INTEGER DEFAULT 500,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca por slug (usado no tenant middleware)
CREATE INDEX IF NOT EXISTS idx_ap_tenants_slug ON ap_tenants(slug);
