import { useEffect, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { api } from '../../services/api';

interface Produto { id: string; nome: string; descricao: string; preco: number; imagem: string; categoria_id: string; ativo: boolean; destaque: boolean; ordem: number; }
interface Categoria { id: string; nome: string; }

export default function ProductsPage() {
  const { tenant } = useTenant();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '', preco: '', imagem: '', categoria_id: '', ativo: true, destaque: false, ordem: 0 });
  const [showForm, setShowForm] = useState(false);

  const primary = tenant?.cor_primaria || '#3B82F6';
  const bg = tenant?.cor_fundo || '#0F172A';
  const text = tenant?.cor_texto || '#FFFFFF';
  const accent = tenant?.cor_destaque || '#60A5FA';

  useEffect(() => {
    api<Produto[]>('/admin/products').then(setProdutos);
    api<Categoria[]>('/admin/categories').then(setCategorias);
  }, []);

  function openNew() {
    setEditing(null);
    setForm({ nome: '', descricao: '', preco: '', imagem: '', categoria_id: '', ativo: true, destaque: false, ordem: 0 });
    setShowForm(true);
  }

  function openEdit(p: Produto) {
    setEditing(p);
    setForm({ nome: p.nome, descricao: p.descricao || '', preco: String(p.preco), imagem: p.imagem || '', categoria_id: p.categoria_id || '', ativo: p.ativo, destaque: p.destaque, ordem: p.ordem });
    setShowForm(true);
  }

  async function handleSave() {
    const body = { ...form, preco: parseFloat(form.preco) || 0 };
    if (editing) {
      const updated = await api<Produto>(`/admin/products/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      setProdutos((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    } else {
      const created = await api<Produto>('/admin/products', { method: 'POST', body: JSON.stringify(body) });
      setProdutos((prev) => [...prev, created]);
    }
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este produto?')) return;
    await api(`/admin/products/${id}`, { method: 'DELETE' });
    setProdutos((prev) => prev.filter((p) => p.id !== id));
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '10px',
    border: `1px solid ${primary}30`, backgroundColor: `${bg}CC`,
    color: text, fontSize: '15px', outline: 'none',
  };

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: text, fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Produtos</h2>
        <button onClick={openNew} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: primary, color: '#FFF', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
          + Novo Produto
        </button>
      </div>

      {/* Lista */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {produtos.map((p) => (
          <div key={p.id} style={{ padding: '20px', borderRadius: '16px', background: `${primary}08`, border: `1px solid ${primary}20` }}>
            {p.imagem && <img src={p.imagem} alt={p.nome} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px', marginBottom: '12px' }} />}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ color: text, fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{p.nome}</h3>
              <span style={{ color: p.ativo ? '#10B981' : '#EF4444', fontSize: '12px', fontWeight: 'bold' }}>{p.ativo ? 'Ativo' : 'Inativo'}</span>
            </div>
            <p style={{ color: accent, fontSize: '20px', fontWeight: 'bold', margin: '0 0 12px' }}>R$ {Number(p.preco).toFixed(2).replace('.', ',')}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => openEdit(p)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${primary}40`, background: 'transparent', color: primary, fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Editar</button>
              <button onClick={() => handleDelete(p.id)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#EF4444', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.7)', display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '500px', padding: '30px', borderRadius: '20px', background: bg, border: `1px solid ${primary}30`, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: text, fontSize: '22px', fontWeight: 'bold', margin: '0 0 24px' }}>{editing ? 'Editar Produto' : 'Novo Produto'}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ color: text, fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Nome</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ color: text, fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Descricao</label>
                <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ color: text, fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Preco (R$)</label>
                <input type="number" step="0.01" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ color: text, fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>URL da Imagem</label>
                <input value={form.imagem} onChange={(e) => setForm({ ...form, imagem: e.target.value })} style={inputStyle} placeholder="https://..." />
              </div>
              <div>
                <label style={{ color: text, fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Categoria</label>
                <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} style={inputStyle}>
                  <option value="">Sem categoria</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <label style={{ color: text, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Ativo
                </label>
                <label style={{ color: text, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.destaque} onChange={(e) => setForm({ ...form, destaque: e.target.checked })} /> Destaque
                </label>
              </div>
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
