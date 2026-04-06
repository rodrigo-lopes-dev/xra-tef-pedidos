import { useEffect, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { api } from '../../services/api';

export default function SettingsPage() {
  const { tenant } = useTenant();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const primary = tenant?.cor_primaria || '#3B82F6';
  const bg = tenant?.cor_fundo || '#0F172A';
  const text = tenant?.cor_texto || '#FFFFFF';

  useEffect(() => {
    api('/admin/settings').then((data) => { setSettings(data); setLoading(false); });
  }, []);

  async function handleSave() {
    setSaving(true);
    setMsg('');
    try {
      await api('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
      // Recarregar pra aplicar novas cores
      window.location.reload();
    } catch (err: any) {
      setMsg('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: text, opacity: 0.5 }}>Carregando...</p>;
  if (!settings) return <p style={{ color: text, opacity: 0.5 }}>Erro ao carregar</p>;

  const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${primary}30`, backgroundColor: `${bg}CC`, color: text, fontSize: '15px', outline: 'none' };
  const labelStyle: React.CSSProperties = { color: text, fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '6px' };
  const sectionStyle: React.CSSProperties = { padding: '24px', borderRadius: '16px', background: `${primary}08`, border: `1px solid ${primary}15`, marginBottom: '20px' };

  const metodos = settings.metodos_pagamento || [];
  function toggleMetodo(id: string) {
    const next = metodos.includes(id) ? metodos.filter((m: string) => m !== id) : [...metodos, id];
    setSettings({ ...settings, metodos_pagamento: next });
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <h2 style={{ color: text, fontSize: '24px', fontWeight: 'bold', margin: '0 0 24px' }}>Configuracoes</h2>

      {/* Branding */}
      <div style={sectionStyle}>
        <h3 style={{ color: text, fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px' }}>Branding</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div><label style={labelStyle}>Nome do estabelecimento</label><input value={settings.nome || ''} onChange={(e) => setSettings({ ...settings, nome: e.target.value })} style={inputStyle} /></div>
          <div><label style={labelStyle}>Logo URL</label><input value={settings.logo_url || ''} onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })} style={inputStyle} placeholder="https://..." /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>Cor primaria</label><input type="color" value={settings.cor_primaria || '#3B82F6'} onChange={(e) => setSettings({ ...settings, cor_primaria: e.target.value })} style={{ ...inputStyle, height: '50px', cursor: 'pointer', padding: '4px' }} /></div>
            <div><label style={labelStyle}>Cor secundaria</label><input type="color" value={settings.cor_secundaria || '#1E40AF'} onChange={(e) => setSettings({ ...settings, cor_secundaria: e.target.value })} style={{ ...inputStyle, height: '50px', cursor: 'pointer', padding: '4px' }} /></div>
            <div><label style={labelStyle}>Cor fundo</label><input type="color" value={settings.cor_fundo || '#0F172A'} onChange={(e) => setSettings({ ...settings, cor_fundo: e.target.value })} style={{ ...inputStyle, height: '50px', cursor: 'pointer', padding: '4px' }} /></div>
            <div><label style={labelStyle}>Cor texto</label><input type="color" value={settings.cor_texto || '#FFFFFF'} onChange={(e) => setSettings({ ...settings, cor_texto: e.target.value })} style={{ ...inputStyle, height: '50px', cursor: 'pointer', padding: '4px' }} /></div>
            <div><label style={labelStyle}>Cor destaque</label><input type="color" value={settings.cor_destaque || '#60A5FA'} onChange={(e) => setSettings({ ...settings, cor_destaque: e.target.value })} style={{ ...inputStyle, height: '50px', cursor: 'pointer', padding: '4px' }} /></div>
          </div>
        </div>
      </div>

      {/* Totem */}
      <div style={sectionStyle}>
        <h3 style={{ color: text, fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px' }}>Totem / Tela</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Modo de chamada</label>
            <select value={settings.modo_chamada || 'pager'} onChange={(e) => setSettings({ ...settings, modo_chamada: e.target.value })} style={inputStyle}>
              <option value="pager">Pager (numero)</option>
              <option value="nome">Nome do cliente</option>
              <option value="ambos">Ambos (pager + nome)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Modo de tela</label>
            <select value={settings.modo_tela || 'monitor'} onChange={(e) => setSettings({ ...settings, modo_tela: e.target.value })} style={inputStyle}>
              <option value="monitor">Monitor (tela grande)</option>
              <option value="tablet">Tablet (compacto)</option>
            </select>
          </div>
          <label style={{ color: text, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={settings.mostrar_todos !== false} onChange={(e) => setSettings({ ...settings, mostrar_todos: e.target.checked })} />
            Mostrar botao "Todos" nas categorias
          </label>
          <div><label style={labelStyle}>Mensagem de boas-vindas</label><input value={settings.mensagem_boas_vindas || ''} onChange={(e) => setSettings({ ...settings, mensagem_boas_vindas: e.target.value })} style={inputStyle} /></div>
          <div><label style={labelStyle}>Mensagem rodape comanda</label><input value={settings.mensagem_rodape_comanda || ''} onChange={(e) => setSettings({ ...settings, mensagem_rodape_comanda: e.target.value })} style={inputStyle} /></div>
        </div>
      </div>

      {/* Pagamento */}
      <div style={sectionStyle}>
        <h3 style={{ color: text, fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px' }}>Metodos de Pagamento</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { id: 'dinheiro', label: 'Dinheiro', color: '#10B981' },
            { id: 'credito', label: 'Credito', color: '#3B82F6' },
            { id: 'debito', label: 'Debito', color: '#F59E0B' },
            { id: 'voucher', label: 'Voucher', color: '#8B5CF6' },
          ].map((m) => (
            <label key={m.id} style={{ color: text, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 16px', borderRadius: '10px', background: metodos.includes(m.id) ? `${m.color}20` : 'transparent', border: `1px solid ${metodos.includes(m.id) ? m.color : primary + '20'}` }}>
              <input type="checkbox" checked={metodos.includes(m.id)} onChange={() => toggleMetodo(m.id)} />
              {m.label}
            </label>
          ))}
        </div>
      </div>

      {/* Impressora / TEF */}
      <div style={sectionStyle}>
        <h3 style={{ color: text, fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px' }}>Impressora e Maquininha</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div><label style={labelStyle}>Nome da impressora</label><input value={settings.printer_name || ''} onChange={(e) => setSettings({ ...settings, printer_name: e.target.value })} style={inputStyle} placeholder="Ex: ELGIN i8" /></div>
          <div><label style={labelStyle}>Stone Code</label><input value={settings.stone_code || ''} onChange={(e) => setSettings({ ...settings, stone_code: e.target.value })} style={inputStyle} /></div>
          <label style={{ color: text, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={settings.maquininha_ativa || false} onChange={(e) => setSettings({ ...settings, maquininha_ativa: e.target.checked })} />
            Maquininha ativa
          </label>
          <div><label style={labelStyle}>Webhook Comanda (URL do n8n)</label><input value={settings.webhook_comanda || ''} onChange={(e) => setSettings({ ...settings, webhook_comanda: e.target.value })} style={inputStyle} placeholder="https://n8n.xrtec1.com/webhook/..." /></div>
        </div>
      </div>

      {/* Salvar */}
      {msg && <p style={{ color: msg.startsWith('Erro') ? '#EF4444' : '#10B981', fontSize: '14px', marginBottom: '12px' }}>{msg}</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%', padding: '18px', borderRadius: '14px', border: 'none',
          background: primary, color: '#FFF', fontSize: '18px', fontWeight: 'bold',
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1,
        }}
      >
        {saving ? 'Salvando...' : 'Salvar Configuracoes'}
      </button>
    </div>
  );
}
