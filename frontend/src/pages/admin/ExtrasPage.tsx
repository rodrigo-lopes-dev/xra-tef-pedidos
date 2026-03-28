import { useEffect, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { api } from '../../services/api';

interface Adicional { id: string; nome: string; preco: number; ordem: number; ativo: boolean; categoria_id: string | null; }
interface Categoria { id: string; nome: string; }

export default function ExtrasPage() {
  const { tenant } = useTenant();
  const [adicionais, setAdicionais] = useState<Adicional[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editing, setEditing] = useState<Adicional | null>(null);
  const [form, setForm] = useState({ nome: '', preco: '', ordem: 0, ativo: true, categoria_id: '' });
  const [showForm, setShowForm] = useState(false);

  const primary = tenant?.cor_primaria || '#3B82F6';
  const bg = tenant?.cor_fundo || '#0F172A';
  const text = tenant?.cor_texto || '#FFFFFF';
  const accent = tenant?.cor_destaque || '#60A5FA';

  useEffect(() => {
    api<Adicional[]>('/admin/extras').then(setAdicionais);
    api<Categoria[]>('/admin/categories').then(setCategorias);
  }, []);

  function openNew() { setEditing(null); setForm({ nome: '', preco: '', ordem: 0, ativo: true, categoria_id: '' }); setShowForm(true); }
  function openEdit(a: Adicional) { setEditing(a); setForm({ nome: a.nome, preco: String(a.preco), ordem: a.ordem, ativo: a.ativo, categoria_id: a.categoria_id || '' }); setShowForm(true); }

  async function handleSave() {
    const body = { ...form, preco: parseFloat(form.preco) || 0, categoria_id: form.categoria_id || null };
    if (editing) {
      const updated = await api<Adicional>(`/admin/extras/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      setAdicionais((prev) => prev.map((a) => a.id === updated.id ? updated : a));
    } else {
      const created = await api<Adicional>('/admin/extras', { method: 'POST', body: JSON.stringify(body) });
      setAdicionais((prev) => [...prev, created]);
    }
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este adicional?')) return;
    await api(`/admin/extras/${id}`, { method: 'DELETE' });
    setAdicionais((prev) => prev.filter((a) => a.id !== id));
  }

  const catNome = (id: string | null) => categorias.find(c => c.id === id)?.nome || 'Todas';
  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${primary}30`, backgroundColor: `${bg}CC`, color: text, fontSize: '15px', outline: 'none' };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: text, fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Adicionais</h2>
        <button onClick={openNew} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: primary, color: '#FFF', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>+ Novo Adicional</button>
      </div>

      {adicionais.map((a) => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderRadius: '14px', background: `${primary}08`, border: `1px solid ${primary}20`, marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <span style={{ color: text, fontSize: '17px', fontWeight: 'bold' }}>{a.nome}</span>
            <span style={{ color: accent, fontSize: '15px', fontWeight: 'bold', marginLeft: '12px' }}>R$ {Number(a.preco).toFixed(2).replace('.', ',')}</span>
            <span style={{ color: text, opacity: 0.3, fontSize: '12px', marginLeft: '12px' }}>Cat: {catNome(a.categoria_id)}</span>
          </div>
          <span style={{ color: a.ativo ? '#10B981' : '#EF4444', fontSize: '12px', fontWeight: 'bold' }}>{a.ativo ? 'Ativo' : 'Inativo'}</span>
          <button onClick={() => openEdit(a)} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${primary}40`, background: 'transparent', color: primary, fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Editar</button>
          <button onClick={() => handleDelete(a.id)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#EF4444', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Excluir</button>
        </div>
      ))}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.7)', display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '450px', padding: '30px', borderRadius: '20px', background: bg, border: `1px solid ${primary}30` }}>
            <h3 style={{ color: text, fontSize: '22px', fontWeight: 'bold', margin: '0 0 24px' }}>{editing ? 'Editar Adicional' : 'Novo Adicional'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><label style={{ color: text, fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Nome</label><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ color: text, fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Preco (R$)</label><input type="number" step="0.01" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={{ color: text, fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Categoria (em qual categoria aparece)</label>
                <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} style={inputStyle}>
                  <option value="">Todas as categorias</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div><label style={{ color: text, fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Ordem</label><input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: parseInt(e.target.value) || 0 })} style={inputStyle} /></div>
              <label style={{ color: text, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Ativo</label>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: `1px solid ${text}20`, background: 'transparent', color: text, fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: primary, color: '#FFF', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
