import { supabase } from '../config/supabase';
import { clearTenantCache } from '../middleware/tenantMiddleware';

/**
 * CRON: Suspender tenants inadimplentes
 * Roda todo dia as 06:00 (horario de Brasilia)
 *
 * Logica:
 * - Busca tenants ativos com data_vencimento < hoje
 * - Marca status = 'suspenso'
 * - Limpa cache pra forcar re-leitura do banco
 * - Quando o cliente pagar, o admin muda status de volta pra 'ativo' no painel
 */
export async function suspendOverdueTenants(): Promise<void> {
  try {
    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`[CRON] Verificando tenants inadimplentes (vencimento < ${hoje})...`);

    // Buscar tenants ativos com vencimento passado
    const { data: overdue, error: fetchError } = await supabase
      .from('ap_tenants')
      .select('id, nome, slug, codigo, data_vencimento, status')
      .eq('status', 'ativo')
      .lt('data_vencimento', hoje);

    if (fetchError) {
      console.error('[CRON] Erro ao buscar inadimplentes:', fetchError.message);
      return;
    }

    if (!overdue || overdue.length === 0) {
      console.log('[CRON] Nenhum tenant inadimplente. Tudo em dia!');
      return;
    }

    console.log(`[CRON] ${overdue.length} tenant(s) inadimplente(s) encontrado(s):`);

    for (const tenant of overdue) {
      console.log(`[CRON]   - ${tenant.nome} (${tenant.slug}) vencido em ${tenant.data_vencimento}`);

      // Suspender
      const { error: updateError } = await supabase
        .from('ap_tenants')
        .update({
          status: 'suspenso',
          suspenso_em: new Date().toISOString(),
          motivo_suspensao: 'Inadimplencia - vencimento em ' + tenant.data_vencimento
        })
        .eq('id', tenant.id);

      if (updateError) {
        console.error(`[CRON] Erro ao suspender ${tenant.nome}:`, updateError.message);
      } else {
        console.log(`[CRON] ${tenant.nome} SUSPENSO por inadimplencia`);
      }
    }

    // Limpar cache pra forcar re-leitura
    clearTenantCache();

    console.log('[CRON] Verificacao de inadimplencia concluida.');
  } catch (err) {
    console.error('[CRON] Erro geral:', err);
  }
}
