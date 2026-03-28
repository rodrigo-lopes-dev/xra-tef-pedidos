# XRA AutoPay Pedidos - Arquitetura Completa

> SaaS multi-tenant de pedidos para lanchonetes, pizzarias, acaiterias, etc.
> Cada cliente tem seu subdominio: `cliente.autopay.xrtec1.com`
> Todos os clientes tem impressora termica + maquininha Stone integrada.

---

## 1. Visao Geral

```
┌──────────────────────────────────────────────────────────────────┐
│                       INFRAESTRUTURA                             │
│                                                                  │
│  autopay.xrtec1.com              → Landing page / Admin XRTec    │
│  shakalaka.autopay.xrtec1.com    → Tenant "Shaka Laka"          │
│  burguerx.autopay.xrtec1.com     → Tenant "Burguer X"           │
│  painel.xrtec1.com               → Painel XRTec (ja existe)     │
│                                                                  │
│  VPS: 31.97.151.194                                              │
│  Porta 5500 (backend + frontend SaaS)                            │
│  Porta 5400 (painel XRTec - ja rodando)                          │
│  PM2: xra-autopay-pedidos                                        │
│  DB: Supabase PostgreSQL                                         │
│                                                                  │
│  ┌─────────────────────────────────────────┐                     │
│  │  PC LOCAL DO CLIENTE (cada loja)        │                     │
│  │  Python Flask porta 5555                │                     │
│  │  - Impressora termica (ESC/POS via USB) │                     │
│  │  - Stone AutoTEF Slim porta 8000        │                     │
│  │  - Heartbeat pro painel XRTec           │                     │
│  └─────────────────────────────────────────┘                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Stack Tecnologica

| Camada          | Tecnologia                              |
|-----------------|-----------------------------------------|
| Backend         | Node.js + Express + TypeScript          |
| Frontend        | React 18 + Vite + TailwindCSS + TS      |
| Database        | Supabase PostgreSQL + RLS               |
| Auth            | JWT (jsonwebtoken)                      |
| Real-time       | Socket.IO (scoped por tenant)           |
| Impressora      | Python Flask + ESC/POS (win32print)     |
| TEF             | Stone AutoTEF Slim (REST API porta 8000)|
| Monitoramento   | Painel XRTec (painel.xrtec1.com:5400)   |
| Deploy          | PM2 + GitHub Actions                    |
| Proxy           | Hostinger (proxy reverso + SSL)         |

---

## 3. Estrutura de Pastas

```
xra-autopay-pedidos/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.ts              # Cliente Supabase
│   │   ├── middleware/
│   │   │   ├── tenantMiddleware.ts       # Resolve tenant pelo subdominio
│   │   │   ├── authMiddleware.ts         # Valida JWT + extrai tenant
│   │   │   └── rateLimiter.ts            # Rate limiting
│   │   ├── routes/
│   │   │   ├── publicRoutes.ts           # Config tenant + cardapio (sem auth)
│   │   │   ├── authRoutes.ts             # Login
│   │   │   ├── productRoutes.ts          # CRUD produtos
│   │   │   ├── categoryRoutes.ts         # CRUD categorias
│   │   │   ├── extraRoutes.ts            # CRUD adicionais
│   │   │   ├── orderRoutes.ts            # Pedidos + comanda
│   │   │   ├── tefRoutes.ts              # TEF Stone (venda, cancelar, status)
│   │   │   ├── configRoutes.ts           # Configuracoes do tenant
│   │   │   └── uploadRoutes.ts           # Upload de imagens
│   │   ├── controllers/
│   │   │   ├── publicController.ts
│   │   │   ├── authController.ts
│   │   │   ├── productController.ts
│   │   │   ├── categoryController.ts
│   │   │   ├── extraController.ts
│   │   │   ├── orderController.ts
│   │   │   ├── tefController.ts
│   │   │   ├── configController.ts
│   │   │   └── uploadController.ts
│   │   ├── services/
│   │   │   ├── tenantService.ts          # Buscar/cachear tenant
│   │   │   ├── authService.ts            # JWT + bcrypt
│   │   │   ├── productService.ts         # Produtos (com tenant_id)
│   │   │   ├── categoryService.ts        # Categorias (com tenant_id)
│   │   │   ├── extraService.ts           # Adicionais (com tenant_id)
│   │   │   ├── orderService.ts           # Pedidos (com tenant_id)
│   │   │   ├── comandaService.ts         # Enviar comanda pro print server
│   │   │   └── uploadService.ts          # Upload Supabase Storage
│   │   └── server.ts                     # Entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── contexts/
│   │   │   ├── TenantContext.tsx          # Tema/config do tenant
│   │   │   └── AuthContext.tsx            # Login/session
│   │   ├── pages/
│   │   │   ├── cliente/                  # Tela do totem/autoatendimento
│   │   │   │   ├── HomePage.tsx          # Categorias + produtos em grid
│   │   │   │   ├── CartPage.tsx          # Carrinho + escolha pagamento
│   │   │   │   └── StatusPage.tsx        # Acompanhar pedido
│   │   │   ├── vendedor/                 # Tela do balcao
│   │   │   │   └── VendedorPage.tsx      # Lista pedidos + atualizar status
│   │   │   ├── admin/                    # Painel do dono
│   │   │   │   ├── DashboardPage.tsx     # Resumo vendas do dia
│   │   │   │   ├── ProductsPage.tsx      # CRUD produtos
│   │   │   │   ├── CategoriesPage.tsx    # CRUD categorias
│   │   │   │   ├── ExtrasPage.tsx        # CRUD adicionais
│   │   │   │   ├── OrdersPage.tsx        # Historico de pedidos
│   │   │   │   └── SettingsPage.tsx      # Config: cores, logo, impressora, TEF
│   │   │   └── auth/
│   │   │       └── LoginPage.tsx
│   │   ├── components/
│   │   │   ├── ui/                       # Botoes, inputs, modais genericos
│   │   │   ├── ProductCard.tsx
│   │   │   ├── CartItem.tsx
│   │   │   ├── OrderCard.tsx
│   │   │   ├── CardPaymentModal.tsx      # Modal de pagamento na maquininha
│   │   │   └── Layout.tsx                # Sidebar admin
│   │   ├── services/
│   │   │   └── api.ts                    # Fetch wrapper com JWT
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css                     # TailwindCSS + CSS variables
│   ├── package.json
│   └── vite.config.ts
├── servidor_impressora/
│   └── print_server.py                   # Print server generico (base pra cada cliente)
├── database/
│   ├── 01_tenants.sql                    # Tabela tenants
│   ├── 02_tables.sql                     # Todas as tabelas com tenant_id
│   ├── 03_rls.sql                        # Row Level Security
│   └── 04_seed.sql                       # Tenant de teste
├── .github/
│   └── workflows/
│       └── deploy.yml
├── .env.example
├── .gitignore
├── ecosystem.config.js                   # PM2
├── package.json                          # Root (scripts de build)
└── ARQUITETURA.md                        # Este arquivo
```

---

## 4. Schema do Banco de Dados

### 4.1 Tabela `tenants`

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(63) UNIQUE NOT NULL,              -- subdominio: "shakalaka", "burguerx"
  nome VARCHAR(255) NOT NULL,                    -- "Shaka Laka Lanches"

  -- Branding (cores que o frontend carrega)
  logo_url TEXT,
  favicon_url TEXT,
  cor_primaria VARCHAR(7) DEFAULT '#3B82F6',     -- botoes, links, destaque
  cor_secundaria VARCHAR(7) DEFAULT '#1E40AF',   -- hover, fundo secundario
  cor_fundo VARCHAR(7) DEFAULT '#0F172A',        -- fundo geral
  cor_texto VARCHAR(7) DEFAULT '#FFFFFF',        -- texto principal
  cor_destaque VARCHAR(7) DEFAULT '#60A5FA',     -- badges, preco, realce

  -- Negocio
  cnpj VARCHAR(18),
  telefone VARCHAR(20),
  email VARCHAR(255),
  endereco TEXT,

  -- Impressora (cada tenant configura o nome da impressora do PC local)
  printer_name VARCHAR(100) DEFAULT '',          -- ex: "ELGIN i8", "Epson TM-T20X"
  printer_width INTEGER DEFAULT 42,              -- largura em caracteres (42 = 80mm, 32 = 58mm)

  -- TEF Stone
  stone_code VARCHAR(20) DEFAULT '',             -- Stonecode do cliente na Stone
  maquininha_ativa BOOLEAN DEFAULT FALSE,        -- habilita pagamento na maquininha

  -- Configuracoes gerais
  push_notifications BOOLEAN DEFAULT TRUE,
  mensagem_boas_vindas TEXT DEFAULT 'Bem-vindo! Faca seu pedido.',
  mensagem_rodape_comanda TEXT DEFAULT 'Obrigado pela preferencia!',

  -- Plano
  plano VARCHAR(20) DEFAULT 'basico',            -- basico, pro, enterprise
  status VARCHAR(20) DEFAULT 'ativo',            -- ativo, suspenso, trial
  max_pedidos_mes INTEGER DEFAULT 500,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Tabelas do sistema (todas com tenant_id)

```sql
-- ═══════════════════════════════════════════════
-- CATEGORIAS
-- ═══════════════════════════════════════════════
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  nome VARCHAR(100) NOT NULL,
  imagem TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- PRODUTOS
-- ═══════════════════════════════════════════════
CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  categoria_id UUID REFERENCES categorias(id),
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  imagem TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  destaque BOOLEAN DEFAULT FALSE,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- ADICIONAIS (ex: bacon, queijo extra, molho)
-- ═══════════════════════════════════════════════
CREATE TABLE adicionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  nome VARCHAR(100) NOT NULL,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- PEDIDOS
-- ═══════════════════════════════════════════════
CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  numero_pedido VARCHAR(20) NOT NULL,            -- formato: #YYYYMMDD-100, 101, 102...
  codigo_comanda VARCHAR(10),                    -- codigo curto: "A4B7X2"
  nome_cliente VARCHAR(200),
  status VARCHAR(20) DEFAULT 'novo',             -- novo, preparando, pronto, entregue, cancelado
  tipo_pagamento VARCHAR(20) DEFAULT 'dinheiro', -- dinheiro, cartao
  subtotal DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  observacao TEXT,

  -- TEF (preenchido quando paga na maquininha)
  tef_nsu VARCHAR(50),
  tef_atk VARCHAR(100),
  tef_bandeira VARCHAR(50),
  tef_autorizacao VARCHAR(50),
  tef_cartao_masked VARCHAR(30),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- ITENS DO PEDIDO
-- ═══════════════════════════════════════════════
CREATE TABLE itens_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id),
  nome_produto VARCHAR(200) NOT NULL,
  quantidade INTEGER DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  preco_total DECIMAL(10,2) NOT NULL,
  adicionais JSONB DEFAULT '[]',                 -- [{nome: "Bacon", preco: 3.00}]
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- USUARIOS (admin e vendedor do tenant)
-- ═══════════════════════════════════════════════
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  nome VARCHAR(200) NOT NULL,
  usuario VARCHAR(100) NOT NULL,
  senha_hash TEXT NOT NULL,                      -- bcrypt
  tipo VARCHAR(20) DEFAULT 'vendedor',           -- admin, vendedor
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, usuario)                     -- usuario unico por tenant
);

-- ═══════════════════════════════════════════════
-- TRANSACOES TEF (log de cada transacao Stone)
-- ═══════════════════════════════════════════════
CREATE TABLE transacoes_tef (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  pedido_id UUID REFERENCES pedidos(id),
  stone_code VARCHAR(20),
  valor DECIMAL(10,2) NOT NULL,
  tipo VARCHAR(20),                              -- credito, debito, voucher
  status VARCHAR(20),                            -- approved, denied, error, timeout
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

-- ═══════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════
CREATE INDEX idx_categorias_tenant ON categorias(tenant_id, ordem);
CREATE INDEX idx_produtos_tenant ON produtos(tenant_id, ativo);
CREATE INDEX idx_adicionais_tenant ON adicionais(tenant_id, ativo);
CREATE INDEX idx_pedidos_tenant ON pedidos(tenant_id, status, created_at);
CREATE INDEX idx_pedidos_numero ON pedidos(tenant_id, numero_pedido);
CREATE INDEX idx_itens_pedido ON itens_pedido(tenant_id, pedido_id);
CREATE INDEX idx_usuarios_tenant ON usuarios(tenant_id, usuario);
CREATE INDEX idx_transacoes_tef ON transacoes_tef(tenant_id, created_at);
```

### 4.3 Row Level Security (RLS)

```sql
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE adicionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes_tef ENABLE ROW LEVEL SECURITY;

-- O backend usa service_role (bypassa RLS)
-- RLS e defesa extra caso algo escape na aplicacao
```

---

## 5. Fluxo Multi-Tenant

### 5.1 Como o tenant e resolvido

```
1. Cliente acessa: burguerx.autopay.xrtec1.com
                            |
2. Hostinger proxy → VPS porta 5500
                            |
3. tenantMiddleware.ts extrai "burguerx" do Host header
   Host: burguerx.autopay.xrtec1.com
   slug = host.split('.')[0]  →  "burguerx"
                            |
4. Busca tenant no banco (com cache em memoria, TTL 5min):
   SELECT * FROM tenants WHERE slug = 'burguerx' AND status = 'ativo'
                            |
5. Anexa ao request:
   req.tenant = { id, slug, nome, cores, printer_name, stone_code, ... }
                            |
6. TODAS as queries no banco incluem:
   .eq('tenant_id', req.tenant.id)
                            |
7. Frontend carrega tema na inicializacao:
   GET /api/tenant/config → { nome, logo, cores, maquininha_ativa }
   Aplica CSS variables no :root
```

### 5.2 Fluxo de um pedido completo

```
TOTEM DO CLIENTE (frontend)
    |
    ├─ 1. Carrega cardapio: GET /api/products (filtrado por tenant_id)
    ├─ 2. Cliente monta carrinho
    ├─ 3. Escolhe pagamento: DINHEIRO ou CARTAO
    |
    ├─ Se DINHEIRO:
    │   └─ POST /api/orders { itens, tipo_pagamento: 'dinheiro' }
    │       → Backend cria pedido (status: 'novo')
    │       → Backend gera numero_pedido (#YYYYMMDD-100) e codigo_comanda (A4B7X2)
    │       → Backend envia comanda pro print server local
    │       → Socket.IO emite 'novo_pedido' pro vendedor (scoped por tenant)
    │       → Tela de sucesso com numero do pedido
    |
    └─ Se CARTAO (maquininha):
        └─ Frontend chama direto: POST localhost:5555/tef/venda { valor, tipo }
            → Print server local faz POST http://localhost:8000/api/Pay
            → Pinpad Stone pede cartao ao cliente
            → Se aprovado:
                → Frontend recebe dados TEF (nsu, bandeira, atk...)
                → POST /api/orders { itens, tipo_pagamento: 'cartao', tef_data }
                → Backend cria pedido com dados TEF
                → Backend envia comanda pro print server
                → Print server imprime cupom TEF (via/estabelecimento + via/cliente)
                → Socket.IO emite 'novo_pedido'
            → Se negado:
                → Frontend mostra erro ao cliente
                → Log enviado pro painel XRTec

VENDEDOR (frontend /vendedor)
    |
    ├─ Recebe pedido em tempo real via Socket.IO
    ├─ Muda status: novo → preparando → pronto → entregue
    └─ Cada mudanca de status emite Socket.IO pro cliente acompanhar

ADMIN (frontend /admin)
    |
    ├─ Dashboard: vendas do dia, total faturado
    ├─ CRUD: produtos, categorias, adicionais
    └─ Config: cores, logo, nome impressora, toggle maquininha
```

---

## 6. API Endpoints

### 6.1 Publicas (sem auth, tenant resolvido pelo subdominio)

```
GET  /api/tenant/config                → Branding: nome, logo, cores, maquininha_ativa
GET  /api/categories                   → Categorias ativas do tenant
GET  /api/products                     → Produtos ativos do tenant
GET  /api/products/:id                 → Detalhe de um produto
GET  /api/extras                       → Adicionais ativos do tenant
POST /api/orders                       → Criar pedido (chamado pelo totem)
GET  /api/orders/:id/status            → Acompanhar status do pedido
```

### 6.2 Autenticadas (JWT - admin/vendedor do tenant)

```
POST /api/auth/login                   → Login → retorna JWT com { userId, tenantId, tipo }
GET  /api/auth/verify                  → Verificar se token e valido

-- Produtos (admin)
GET    /api/admin/products             → Todos (ativos + inativos)
POST   /api/admin/products             → Criar produto
PUT    /api/admin/products/:id         → Editar produto
DELETE /api/admin/products/:id         → Remover produto

-- Categorias (admin)
GET    /api/admin/categories
POST   /api/admin/categories
PUT    /api/admin/categories/:id
DELETE /api/admin/categories/:id

-- Adicionais (admin)
GET    /api/admin/extras
POST   /api/admin/extras
PUT    /api/admin/extras/:id
DELETE /api/admin/extras/:id

-- Pedidos (admin + vendedor)
GET    /api/admin/orders               → Listar pedidos (filtros por status, data)
GET    /api/admin/orders/daily-sales   → Estatisticas de vendas do dia
GET    /api/admin/orders/stats         → Resumo: total pedidos, faturamento, por status
PATCH  /api/admin/orders/:id/status    → Atualizar status (novo→preparando→pronto→entregue)

-- TEF (rotas que o backend usa, nao o frontend direto)
GET    /api/tef/status                 → Status do AutoTEF Slim
POST   /api/tef/venda                  → Processar venda (proxy pro print server local)
POST   /api/tef/cancelar               → Cancelar transacao (so admin)

-- Config (admin)
GET    /api/admin/settings             → Config do tenant
PUT    /api/admin/settings             → Atualizar: cores, logo, printer_name, stone_code

-- Upload (admin)
POST   /api/admin/upload               → Upload de imagem (Supabase Storage)
```

---

## 7. Frontend - Tema Dinamico

### 7.1 CSS Variables (carregadas do tenant via API)

```css
/* index.css - cores default, sobrescritas pelo TenantContext */
:root {
  --color-primary: #3B82F6;
  --color-secondary: #1E40AF;
  --color-background: #0F172A;
  --color-text: #FFFFFF;
  --color-accent: #60A5FA;
}

/* Todos os componentes usam as variaveis, NUNCA cores hardcoded */
.btn-primary {
  background-color: var(--color-primary);
}
.bg-main {
  background-color: var(--color-background);
}
```

### 7.2 TenantContext.tsx

```tsx
// Fluxo de inicializacao:
//
// 1. App monta → TenantProvider faz GET /api/tenant/config
//
// 2. Resposta:
//    {
//      nome: "Burguer X",
//      logo_url: "https://...",
//      cor_primaria: "#EF4444",
//      cor_secundaria: "#B91C1C",
//      cor_fundo: "#1C1917",
//      cor_texto: "#FFFFFF",
//      cor_destaque: "#F87171",
//      maquininha_ativa: true,
//      mensagem_boas_vindas: "Bem-vindo ao Burguer X!"
//    }
//
// 3. Aplica CSS variables no document.documentElement:
//    document.documentElement.style.setProperty('--color-primary', '#EF4444')
//    ... (todas as cores)
//
// 4. Disponibiliza via useContext:
//    const { tenant } = useTenant()
//    <h1>{tenant.nome}</h1>
//    <img src={tenant.logo_url} />
//
// 5. Se tenant nao existe (slug invalido):
//    Mostra tela "Loja nao encontrada"
```

### 7.3 Paginas

```
CLIENTE (totem/autoatendimento):
  /                    → HomePage: categorias em grid, produtos, busca
  /cart                → Carrinho: itens, adicionais, total, escolha pagamento
  /status/:id          → Acompanhar pedido em tempo real

VENDEDOR (balcao):
  /vendedor            → Lista de pedidos por status, atualizar status

ADMIN (dono da loja):
  /login               → Login (usuario + senha)
  /admin               → Dashboard: vendas do dia, pedidos por status
  /admin/products      → CRUD produtos (nome, preco, imagem, categoria, ativo)
  /admin/categories    → CRUD categorias (nome, imagem, ordem)
  /admin/extras        → CRUD adicionais (nome, preco, ativo)
  /admin/orders        → Historico de pedidos com filtros
  /admin/settings      → Configuracoes:
                           - Branding: logo, cores (5 cores), nome
                           - Impressora: nome da impressora, largura
                           - Maquininha: toggle ativo, stonecode
                           - Mensagens: boas-vindas, rodape comanda
```

---

## 8. Servidor de Impressao (Print Server)

> Cada loja do cliente tem um PC local rodando este servidor Python.
> O servidor se comunica com a impressora termica (USB) e com o pinpad Stone (USB).

### 8.1 Configuracao por tenant

O print server le as configuracoes do tenant (nome da impressora, stonecode, etc).
Essas configuracoes ficam no arquivo `.env` local do PC ou sao passadas pelo backend.

```python
# Configuracoes que mudam por cliente:
PRINTER_NAME = "ELGIN i8"              # Nome da impressora no Windows (cada cliente tem a sua)
PRINTER_WIDTH = 42                      # 42 chars = 80mm, 32 chars = 58mm
STONE_CODE = "101903756"                # Stonecode do cliente na Stone
STONE_API_URL = "http://localhost:8000" # AutoTEF Slim sempre roda local
TENANT_SLUG = "shakalaka"              # Identifica o tenant
PAINEL_URL = "https://painel.xrtec1.com" # URL do painel XRTec (fixo)
```

### 8.2 Endpoints do Print Server (porta 5555)

```
GET  /health              → Status: impressora, TEF, timestamp
POST /print               → Imprimir comanda do pedido
GET  /test                → Impressao de teste

POST /tef/venda           → Processar pagamento cartao
POST /tef/cancelar        → Cancelar transacao (so operador)
GET  /tef/status          → Status do Stone AutoTEF Slim
```

### 8.3 Fluxo de impressao de comanda

```
1. Cliente faz pedido no totem
2. Backend cria pedido no Supabase
3. Backend faz POST no print server local:
   POST http://localhost:5555/print
   Body: {
     codigo: "A4B7X2",
     numero_pedido: "#20260328-103",
     data_hora: "28/03/2026 14:30:00",
     nome_cliente: "Joao",
     valor_total: 45.90,
     itens: [
       {
         quantidade: 2,
         nome: "X-Bacon",
         preco_unitario: 18.00,
         adicionais: [{ nome: "Queijo extra", preco: 3.00 }],
         observacao: "Sem cebola"
       }
     ],
     observacoes_pedido: null,
     mensagem_rodape: "Obrigado pela preferencia! Burguer X"
   }
4. Print server formata em ESC/POS e envia pra impressora via USB (win32print)
```

### 8.4 Formato da comanda impressa (ESC/POS)

```
================================
       [NOME DO TENANT]
    COMANDA DE PEDIDO
================================

  *** A4B7X2 ***        ← codigo grande, bold

PEDIDO #20260328-103
28/03/2026 14:30

JOAO                    ← nome do cliente (bold)

--------------------------------
2x X-BACON              ← item (bold, grande)
   + Queijo extra  R$ 3,00
   Obs: Sem cebola

1x COCA-COLA 600ML
--------------------------------

TOTAL: R$ 45,90         ← grande, bold

Obrigado pela preferencia!
Burguer X

================================
[corte do papel]
```

### 8.5 Fluxo TEF (pagamento na maquininha)

```
1. Frontend do totem chama DIRETO o print server local:
   POST http://localhost:5555/tef/venda
   Body: { valor: 45.90, tipo: "credito" }

2. Print server chama Stone AutoTEF Slim:
   POST http://localhost:8000/api/Pay
   Body: {
     Amount: 4590,           (centavos)
     TransactionType: 4,     (credito=4, debito=3, voucher=5)
     Stonecode: "101903756",
     PartnerName: "XRA AutoPay"
   }

3. Pinpad mostra "Insira/aproxime o cartao" (timeout: 120s)

4. Se aprovado:
   - Print server retorna pro frontend:
     {
       sucesso: true,
       nsuCTF: "123456",
       codigoAprovacao: "654321",
       bandeira: "VISA",
       cartao: "****1234",
       stone_atk: "abc123",
       stone_transaction_type: 4,
       stone_pan_mask: "1234",
       cupomEstabelecimento: "...",
       cupomCliente: "..."
     }
   - Print server imprime cupom TEF (via estabelecimento + via cliente)
   - Print server envia log pro painel XRTec:
     POST https://painel.xrtec1.com/api/xrtec/transaction-log

5. Se negado:
   - Print server retorna: { sucesso: false, mensagem: "Cartao sem limite" }
   - Log de negada enviado pro painel XRTec

6. Frontend recebe resposta e inclui dados TEF no pedido:
   POST /api/orders { ..., tipo_pagamento: 'cartao', tef_nsu, tef_bandeira, tef_atk }
```

### 8.6 Heartbeat (monitoramento)

```
O print server envia heartbeat a cada 60 segundos pro painel XRTec:

POST https://painel.xrtec1.com/api/xrtec/heartbeat
Body: {
  stone_code: "101903756",
  print_server_online: true,
  autotef_online: true/false,    (verifica GET localhost:8000/api/Healthcheck)
  printer_online: true/false      (verifica se impressora existe no Windows)
}

O painel XRTec mostra em tempo real:
- Quais totens estao online/offline
- Status de cada servico (impressora, TEF)
- Ultimo heartbeat recebido
```

---

## 9. Socket.IO (Real-time por tenant)

```typescript
// ═══════════════════════════════════════════════
// SERVIDOR (backend)
// ═══════════════════════════════════════════════

// No connect, identifica o tenant e junta na sala
io.on('connection', (socket) => {
  const tenantId = socket.handshake.query.tenantId;
  socket.join(`tenant:${tenantId}`);
});

// Quando cria pedido:
io.to(`tenant:${tenantId}`).emit('novo_pedido', pedido);

// Quando muda status:
io.to(`tenant:${tenantId}`).emit('pedido_atualizado', { id, status });

// ═══════════════════════════════════════════════
// CLIENTE (frontend)
// ═══════════════════════════════════════════════

// Conecta passando tenantId
const socket = io({ query: { tenantId: tenant.id } });

// Vendedor escuta novos pedidos:
socket.on('novo_pedido', (pedido) => { /* adiciona na lista */ });

// Cliente acompanha status:
socket.on('pedido_atualizado', ({ id, status }) => { /* atualiza tela */ });
```

---

## 10. Tenant Middleware (como funciona)

```typescript
// backend/src/middleware/tenantMiddleware.ts

// Cache em memoria (Map simples, TTL 5 minutos)
const tenantCache = new Map<string, { tenant: Tenant; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export async function tenantMiddleware(req, res, next) {
  // 1. Extrair slug do Host header
  //    Host: "burguerx.autopay.xrtec1.com"
  //    slug = "burguerx"
  const host = req.hostname;
  const slug = host.split('.')[0];

  // 2. Ignorar se for o dominio base (autopay.xrtec1.com)
  if (slug === 'autopay') {
    return res.status(404).json({ error: 'Acesse pelo subdominio do seu estabelecimento' });
  }

  // 3. Buscar no cache ou no banco
  let tenant = getCached(slug);
  if (!tenant) {
    tenant = await supabase.from('tenants').select('*')
      .eq('slug', slug).eq('status', 'ativo').single();
    if (!tenant) return res.status(404).json({ error: 'Estabelecimento nao encontrado' });
    setCache(slug, tenant);
  }

  // 4. Anexar ao request
  req.tenant = tenant;
  next();
}
```

---

## 11. Auth (JWT)

```typescript
// backend/src/services/authService.ts

// Login:
// 1. Recebe { usuario, senha }
// 2. Busca usuario na tabela usuarios WHERE tenant_id = req.tenant.id AND usuario = ?
// 3. Compara senha com bcrypt.compare(senha, senha_hash)
// 4. Gera JWT:
//    {
//      userId: "uuid",
//      tenantId: "uuid",
//      tipo: "admin",  // ou "vendedor"
//      iat: timestamp,
//      exp: timestamp + 24h
//    }
// 5. Retorna { token, user: { nome, tipo } }

// Middleware de auth:
// 1. Extrai Bearer token do header Authorization
// 2. Verifica JWT com segredo (process.env.JWT_SECRET)
// 3. Extrai tenantId do payload
// 4. Compara com req.tenant.id (do tenantMiddleware)
//    Se nao bate → 403 Forbidden (usuario tentando acessar outro tenant)
// 5. Anexa req.user = { userId, tenantId, tipo }
```

---

## 12. Deploy

### 12.1 PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'xra-autopay-pedidos',
    script: 'backend/dist/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 5500,
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '512M',
  }],
};
```

### 12.2 Hostinger Proxy

```
Na Hostinger, criar proxy host:
  Source: *.autopay.xrtec1.com
  Destination: http://31.97.151.194:5500
  SSL: Let's Encrypt
  Websocket: habilitado (para Socket.IO)
```

### 12.3 GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to VPS
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          password: ${{ secrets.VPS_PASSWORD }}
          port: 22
          script: |
            cd ~/xra-autopay-pedidos
            git pull origin main
            cd backend && npm install && cd ..
            cd frontend && npm install && cd ..
            npm run build
            pm2 restart xra-autopay-pedidos
```

### 12.4 Variaveis de ambiente (.env)

```bash
# Supabase
SUPABASE_URL=https://igtzpmqiwerxeiihqwpg.supabase.co
SUPABASE_ANON_KEY=sua_chave_aqui

# Server
PORT=5500
NODE_ENV=production

# JWT
JWT_SECRET=uma_chave_secreta_forte_aqui

# Painel XRTec (para enviar logs)
XRTEC_PAINEL_URL=https://painel.xrtec1.com
```

---

## 13. Onboarding de Novo Cliente

```
1. ADMIN XRTEC cadastra tenant no Supabase:

   INSERT INTO tenants (slug, nome, cor_primaria, cor_secundaria, cor_fundo,
     cor_texto, cor_destaque, cnpj, printer_name, stone_code, maquininha_ativa)
   VALUES (
     'burguerx',           -- subdominio
     'Burguer X',          -- nome
     '#EF4444',            -- vermelho
     '#B91C1C',
     '#1C1917',
     '#FFFFFF',
     '#F87171',
     '12.345.678/0001-90',
     'Epson TM-T20X',      -- nome da impressora no Windows do cliente
     '123456789',           -- stonecode do cliente
     true                   -- maquininha ativada
   );

2. ADMIN XRTEC cria usuario admin do cliente:

   INSERT INTO usuarios (tenant_id, nome, usuario, senha_hash, tipo)
   VALUES (
     'uuid-do-tenant',
     'Joao Dono',
     'joao',
     '$2b$10$...hash_bcrypt...',  -- gerar com bcrypt
     'admin'
   );

3. Cria subdominio na Hostinger:
   burguerx.autopay.xrtec1.com → proxy pra 31.97.151.194:5500

4. Instala print server no PC do cliente:
   - Copia servidor_impressora/print_server.py
   - Configura .env local: PRINTER_NAME, STONE_CODE, TENANT_SLUG
   - Instala AutoTEF Slim da Stone
   - Ativa stonecode no pinpad
   - Testa impressao e pagamento

5. Cliente acessa burguerx.autopay.xrtec1.com/login
   → Faz login com credenciais criadas
   → Cadastra categorias e produtos com imagens
   → Pronto pra operar!
```

---

## 14. Integracao com Painel XRTec (ja existe em painel.xrtec1.com)

```
O painel XRTec ja esta rodando e monitora:
- Logs de transacoes TEF (aprovadas, negadas, erros)
- Heartbeat dos totens (online/offline, impressora, TEF)
- Clientes cadastrados

O print server de cada tenant envia:
- Transaction logs → POST https://painel.xrtec1.com/api/xrtec/transaction-log
- Heartbeat → POST https://painel.xrtec1.com/api/xrtec/heartbeat

Nao precisa mudar nada no painel. Cada novo cliente aparece automaticamente
quando o print server dele comeca a enviar heartbeat.
```

---

## 15. Resumo: o que cada parte faz

| Componente | Onde roda | Porta | O que faz |
|---|---|---|---|
| Backend SaaS | VPS | 5500 | API multi-tenant, pedidos, auth, Socket.IO |
| Frontend SaaS | VPS (servido pelo backend) | 5500 | Totem, vendedor, admin (tema dinamico) |
| Painel XRTec | VPS | 5400 | Monitoramento de todos os clientes |
| Print Server | PC local do cliente | 5555 | Impressora + TEF Stone + heartbeat |
| AutoTEF Slim | PC local do cliente | 8000 | API REST do Stone (pinpad) |
| Supabase | Cloud | - | Banco de dados PostgreSQL |
| Hostinger | Cloud | - | DNS + proxy reverso + SSL |

---

**Repo**: https://github.com/rodrigo-lopes-dev/xra-autopay-pedidos.git
**Porta backend**: 5500
**Dominio**: *.autopay.xrtec1.com
**Painel XRTec**: painel.xrtec1.com
**Supabase**: mesmo projeto (tabelas novas com prefixo tenant_id)
