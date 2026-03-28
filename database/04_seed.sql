-- =============================================
-- XRA AutoPay Pedidos - Seed (dados de teste)
-- Cria tenant de DEMONSTRACAO para testar o sistema
-- Em producao, cada cliente cria seu proprio tenant
-- =============================================

-- Tenant de demonstracao
INSERT INTO ap_tenants (slug, nome, cor_primaria, cor_secundaria, cor_fundo, cor_texto, cor_destaque, printer_name, stone_code, maquininha_ativa, mensagem_boas_vindas, plano, status)
VALUES (
  'demo',
  'Loja Demonstracao',
  '#3B82F6',
  '#1E40AF',
  '#0F172A',
  '#FFFFFF',
  '#60A5FA',
  '',
  '',
  FALSE,
  'Bem-vindo! Faca seu pedido.',
  'basico',
  'ativo'
)
ON CONFLICT (slug) DO NOTHING;

-- Usuario admin de teste
-- Senha: admin123 (bcrypt hash)
-- IMPORTANTE: este usuario e apenas para teste. Remover em producao!
INSERT INTO ap_usuarios (tenant_id, nome, usuario, senha_hash, tipo)
SELECT
  t.id,
  'Admin Demo',
  'admin',
  '$2b$10$8K1p/a0dR1xqM8K3hSEBkOJwalHWwMCMfHpMGJnHsNqN2nmK4m6Km',
  'admin'
FROM ap_tenants t
WHERE t.slug = 'demo'
ON CONFLICT (tenant_id, usuario) DO NOTHING;

-- Categorias de exemplo
INSERT INTO ap_categorias (tenant_id, nome, ordem, ativo)
SELECT t.id, 'Lanches', 1, TRUE FROM ap_tenants t WHERE t.slug = 'demo'
UNION ALL
SELECT t.id, 'Bebidas', 2, TRUE FROM ap_tenants t WHERE t.slug = 'demo'
UNION ALL
SELECT t.id, 'Sobremesas', 3, TRUE FROM ap_tenants t WHERE t.slug = 'demo';

-- Produtos de exemplo
INSERT INTO ap_produtos (tenant_id, categoria_id, nome, descricao, preco, ativo, destaque, ordem)
SELECT
  t.id, c.id, 'X-Bacon',
  'Hamburguer artesanal com bacon crocante, queijo cheddar, alface e tomate',
  22.90, TRUE, TRUE, 1
FROM ap_tenants t
JOIN ap_categorias c ON c.tenant_id = t.id AND c.nome = 'Lanches'
WHERE t.slug = 'demo';

INSERT INTO ap_produtos (tenant_id, categoria_id, nome, descricao, preco, ativo, destaque, ordem)
SELECT
  t.id, c.id, 'Coca-Cola 600ml',
  'Coca-Cola gelada 600ml',
  8.00, TRUE, FALSE, 1
FROM ap_tenants t
JOIN ap_categorias c ON c.tenant_id = t.id AND c.nome = 'Bebidas'
WHERE t.slug = 'demo';

-- Adicionais de exemplo
INSERT INTO ap_adicionais (tenant_id, nome, preco, ordem, ativo)
SELECT t.id, 'Bacon extra', 4.00, 1, TRUE FROM ap_tenants t WHERE t.slug = 'demo'
UNION ALL
SELECT t.id, 'Queijo cheddar', 3.00, 2, TRUE FROM ap_tenants t WHERE t.slug = 'demo'
UNION ALL
SELECT t.id, 'Ovo', 2.50, 3, TRUE FROM ap_tenants t WHERE t.slug = 'demo';
