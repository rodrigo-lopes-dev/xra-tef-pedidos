import { useEffect, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { api } from '../../services/api';

interface Categoria { id: string; nome: string; imagem: string; ordem: number; ativo: boolean; }

export default function CategoriesPage() {
  const { tenant } = useTenant();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [form, setForm] = useState({ nome: '', imagem: '', ordem: 0, ativo: true });
  const [showForm, setShowForm] = useState(false);

  const primary = tenant?.cor_primaria || '#3B82F6';
  const bg = tenant?.cor_fundo || '#0F172A';
  const text = tenant?.cor_texto || '#FFFFFF';

  useEffect(() => { api<Categoria[]>('/admin/categories').then(setCategorias); }, []);

  function openNew() { setEditing(null); setForm({ nome: '', imagem: '', ordem: 0, ativo: true }); setShowForm(true); }
  function openEdit(c: Categoria) { setEditing(c); setForm({ nome: c.nome, imagem: c.imagem || '', ordem: c.ordem, ativo: c.ativo }); setShowForm(true); }

  async function handleSave() {
    if (editing) {
      const updated = await api<Categoria>(`/admin/categories/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
      setCategorias((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    } else {
      const created = await api<Categoria>('/admin/categories', { method: 'POST', body: JSON.stringify(form) });
      setCategorias((prev) => [...prev, created]);
    }
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta categoria?')) return;
    await api(`/admin/categories/${id}`, { method: 'DELETE' });
    setCategorias((prev) => prev.filter((c) => c.id !== id));
  }

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${primary}30`, backgroundColor: `${bg}CC`, color: text, fontSize: '15px', outline: 'none' };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: text, fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Categorias</h2>
        <button onClick={openNew} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: primary, color: '#FFF', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>+ Nova Categoria</button>
      </div>

      {categorias.map((c) => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderRadius: '14px', background: `${primary}08`, border: `1px solid ${primary}20`, marginBottom: '10px' }}>
          {c.imagem && <img src={c.imagem} alt={c.nome} style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover' }} />}
          <div style={{ flex: 1 }}>
            <span style={{ color: text, fontSize: '17px', fontWeight: 'bold' }}>{c.nome}</span>
            <span style={{ color: text, opacity: 0.4, fontSize: '13px', marginLeft: '10px' }}>Ordem: {c.ordem}</span>
          </div>
          <span style={{ color: c.ativo ? '#10B981' : '#EF4444', fontSize: '12px', fontWeight: 'bold' }}>{c.ativo ? 'Ativo' : 'Inativo'}</span>
          <button onClick={() => openEdit(c)} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${primary}40`, background: 'transparent', color: primary, fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Editar</button>
          <button onClick={() => handleDelete(c.id)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#EF4444', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Excluir</button>
        </div>
      ))}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.7)', display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '450px', padding: '30px', borderRadius: '20px', background: bg, border: `1px solid ${primary}30` }}>
            <h3 style={{ color: text, fontSize: '22px', fontWeight: 'bold', margin: '0 0 24px' }}>{editing ? 'Editar Categoria' : 'Nova Categoria'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><label style={{ color: text, fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Nome</label><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={inputStyle} /></div>
              <div><label style={{ color: text, fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>URL da Imagem</label><input value={form.imagem} onChange={(e) => setForm({ ...form, imagem: e.target.value })} style={inputStyle} placeholder="https://..." /></div>
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
