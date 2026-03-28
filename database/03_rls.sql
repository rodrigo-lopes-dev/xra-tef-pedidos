-- =============================================
-- XRA AutoPay Pedidos - Row Level Security (RLS)
--
-- O backend usa service_role key (bypassa RLS).
-- RLS e a SEGUNDA camada de defesa: mesmo que o codigo
-- tenha um bug, o banco impede acesso cruzado entre tenants.
-- =============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE ap_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_adicionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_transacoes_tef ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Policies: cada tabela so permite acesso
-- a linhas do mesmo tenant_id
-- =============================================

-- CATEGORIAS
CREATE POLICY "ap_categorias_tenant_isolation" ON ap_categorias
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- PRODUTOS
CREATE POLICY "ap_produtos_tenant_isolation" ON ap_produtos
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ADICIONAIS
CREATE POLICY "ap_adicionais_tenant_isolation" ON ap_adicionais
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- PEDIDOS
CREATE POLICY "ap_pedidos_tenant_isolation" ON ap_pedidos
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ITENS PEDIDO
CREATE POLICY "ap_itens_pedido_tenant_isolation" ON ap_itens_pedido
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- USUARIOS
CREATE POLICY "ap_usuarios_tenant_isolation" ON ap_usuarios
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- TRANSACOES TEF
CREATE POLICY "ap_transacoes_tef_tenant_isolation" ON ap_transacoes_tef
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);
