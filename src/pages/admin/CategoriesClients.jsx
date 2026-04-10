import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/admin/AdminLayout'
import { Loader2, Plus, Save, ChevronDown, ChevronUp, Edit2, Trash2, CheckCircle, Tag } from 'lucide-react'

const fmt = (n) => n != null && n !== '' ? Number(n).toLocaleString('fr-FR') + ' F' : '—'
const CAT_LABELS = { GPL: 'GPL', CONSIGNE: 'Consigne', ACCESSOIRE: 'Accessoire' }

export default function CategoriesClients() {
  const [categories, setCategories] = useState([])
  const [articles, setArticles] = useState([])
  const [prix, setPrix] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [editId, setEditId] = useState(null)
  const [editNom, setEditNom] = useState('')

  const load = async () => {
    setLoading(true)
    const [{ data: cats }, { data: arts }, { data: pxData }] = await Promise.all([
      supabase.from('categories_clients').select('*').order('nom'),
      supabase.from('articles').select('*').eq('statut', 'actif').order('categorie, nom'),
      supabase.from('prix_categories').select('*'),
    ])
    setCategories(cats ?? [])
    setArticles(arts ?? [])
    const map = {}
    ;(pxData ?? []).forEach(p => { map[`${p.categorie_client_id}_${p.article_id}`] = p.prix })
    setPrix(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const grouped = {}
  articles.forEach(a => {
    if (!grouped[a.categorie]) grouped[a.categorie] = []
    grouped[a.categorie].push(a)
  })

  // Nombre de prix renseignés pour une catégorie
  const countPrix = (catId) => articles.filter(a => {
    const v = prix[`${catId}_${a.id}`]
    return v !== undefined && v !== '' && v > 0
  }).length

  // Ajouter catégorie
  const handleAdd = async () => {
    if (!newCat.trim()) return
    setSaving(true); setError('')
    const { error: err } = await supabase.from('categories_clients').insert({ nom: newCat.trim() })
    setSaving(false)
    if (err) { setError(err.message); return }
    setNewCat(''); setShowAdd(false); setSuccess('Catégorie ajoutée.'); load()
    setTimeout(() => setSuccess(''), 3000)
  }

  // Renommer catégorie
  const handleRename = async (id) => {
    if (!editNom.trim()) return
    const { error: err } = await supabase.from('categories_clients').update({ nom: editNom.trim() }).eq('id', id)
    if (err) { setError(err.message); return }
    setEditId(null); load()
  }

  // Bloquer/débloquer
  const handleToggle = async (id, statut) => {
    await supabase.from('categories_clients').update({ statut: statut === 'actif' ? 'bloque' : 'actif' }).eq('id', id)
    load()
  }

  // Sauvegarder les prix d'une catégorie
  const savePrix = async (catId) => {
    setSaving(true); setError(''); setSuccess('')
    const rows = articles.map(art => {
      const val = prix[`${catId}_${art.id}`]
      return val !== undefined && val !== '' ? { categorie_client_id: catId, article_id: art.id, prix: Number(val) } : null
    }).filter(Boolean)

    for (const row of rows) {
      const { error: err } = await supabase.from('prix_categories').upsert(row, { onConflict: 'categorie_client_id,article_id' })
      if (err) { setError(err.message); setSaving(false); return }
    }
    setSaving(false)
    setSuccess('Prix enregistrés pour ' + categories.find(c => c.id === catId)?.nom + '.')
    setTimeout(() => setSuccess(''), 3000)
  }

  if (loading) return <AdminLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></AdminLayout>

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Catégories de clients</h2>
          <p className="text-sm text-gray-400">Gérez les catégories et définissez les prix de chaque article.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm">
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4 border border-red-100">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl mb-4 border border-emerald-100 flex items-center gap-2"><CheckCircle size={14} /> {success}</div>}

      <div className="space-y-3">
        {categories.map(cat => {
          const isOpen = expanded === cat.id
          const nbPrix = countPrix(cat.id)
          return (
            <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header catégorie */}
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setExpanded(isOpen ? null : cat.id)}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/20">
                    <Tag size={16} className="text-white" />
                  </div>
                  <div>
                    {editId === cat.id ? (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <input value={editNom} onChange={e => setEditNom(e.target.value)}
                          className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm outline-none w-48" autoFocus
                          onKeyDown={e => e.key === 'Enter' && handleRename(cat.id)} />
                        <button onClick={() => handleRename(cat.id)} className="text-blue-600 text-xs font-bold">OK</button>
                        <button onClick={() => setEditId(null)} className="text-gray-400 text-xs">Annuler</button>
                      </div>
                    ) : (
                      <>
                        <p className="font-semibold text-gray-800">{cat.nom}</p>
                        <p className="text-[11px] text-gray-400">{nbPrix}/{articles.length} prix définis</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${cat.statut === 'actif' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {cat.statut}
                  </span>
                  <button onClick={e => { e.stopPropagation(); setEditId(cat.id); setEditNom(cat.nom) }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><Edit2 size={14} /></button>
                  <button onClick={e => { e.stopPropagation(); handleToggle(cat.id, cat.statut) }}
                    className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${cat.statut === 'actif' ? 'text-red-400 hover:text-red-600' : 'text-emerald-400 hover:text-emerald-600'}`}>
                    <Trash2 size={14} />
                  </button>
                  {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>

              {/* Grille prix expandable */}
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50/30">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500">Prix des articles pour <span className="text-blue-600">{cat.nom}</span></p>
                  </div>
                  {Object.entries(grouped).map(([catArt, arts]) => (
                    <div key={catArt}>
                      <div className="px-5 py-2 bg-gray-100/50">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{CAT_LABELS[catArt]}</span>
                      </div>
                      {arts.map(art => {
                        const key = `${cat.id}_${art.id}`
                        const val = prix[key]
                        const hasVal = val !== undefined && val !== '' && Number(val) > 0
                        return (
                          <div key={art.id} className={`flex items-center justify-between px-5 py-3 border-b border-gray-100/50 ${hasVal ? '' : 'opacity-60'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${hasVal ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                              <span className="text-sm text-gray-700">{art.nom}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="number" min="0" placeholder="0"
                                value={prix[key] ?? ''}
                                onChange={e => setPrix(prev => ({ ...prev, [key]: e.target.value }))}
                                className={`w-28 border rounded-lg px-3 py-2 text-sm text-right outline-none transition-colors ${
                                  hasVal ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-white'
                                } focus:border-blue-400`} />
                              <span className="text-[10px] text-gray-400 w-10">FCFA</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                  <div className="px-5 py-4 flex justify-end border-t border-gray-100">
                    <button onClick={() => savePrix(cat.id)} disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-500/20">
                      <Save size={15} /> {saving ? 'Enregistrement...' : 'Enregistrer les prix'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal ajouter */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Nouvelle catégorie</h3>
            <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Nom de la catégorie"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none mb-4 focus:border-blue-400"
              onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Annuler</button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
