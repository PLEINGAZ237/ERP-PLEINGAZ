import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/admin/AdminLayout'
import { Plus, Edit2, ShieldAlert, Search, Loader2, X, DollarSign } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function Clients() {
  const [clients, setClients]       = useState([])
  const [agences, setAgences]       = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtreAgence, setFiltreAgence]     = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState('')

  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState({})
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const [showPrix, setShowPrix]     = useState(null)
  const [articles, setArticles]     = useState([])
  const [prixClient, setPrixClient] = useState({})
  const [prixCategorie, setPrixCategorie] = useState({})
  const [savingPrix, setSavingPrix] = useState(false)
  const [prixSuccess, setPrixSuccess] = useState('')

  const load = async () => {
    setLoading(true)
    const [{ data: cl }, { data: ag }, { data: cat }, { data: art }] = await Promise.all([
      supabase.from('clients').select('*, agences(nom), categories_clients(nom)').order('nom_interne'),
      supabase.from('agences').select('id, nom').eq('statut', 'actif').order('nom'),
      supabase.from('categories_clients').select('id, nom').eq('statut', 'actif').order('nom'),
      supabase.from('articles').select('*').eq('statut', 'actif').order('categorie, nom'),
    ])
    setClients(cl ?? [])
    setAgences(ag ?? [])
    setCategories(cat ?? [])
    setArticles(art ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (filtreAgence && c.agence_id !== filtreAgence) return false
      if (filtreCategorie && c.categorie_client_id !== filtreCategorie) return false
      if (search) {
        const q = search.toLowerCase()
        const match = [c.nom_interne, c.nom_responsable, c.telephone, c.ville, c.localisation]
          .filter(Boolean).some(v => v.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })
  }, [clients, filtreAgence, filtreCategorie, search])

  const emptyForm = () => ({
    nom_interne: '', nom_responsable: '', telephone: '', email: '',
    localisation: '', ville: '', agence_id: '', categorie_client_id: '', notes: '',
  })

  const openCreate = () => {
    setEditing(null); setForm(emptyForm()); setError(''); setShowModal(true)
  }
  const openEdit = (c) => {
    setEditing(c)
    setForm({
      nom_interne: c.nom_interne ?? '', nom_responsable: c.nom_responsable ?? '',
      telephone: c.telephone ?? '', email: c.email ?? '',
      localisation: c.localisation ?? '', ville: c.ville ?? '',
      agence_id: c.agence_id ?? '', categorie_client_id: c.categorie_client_id ?? '',
      notes: c.notes ?? '',
    })
    setError(''); setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    const payload = { ...form }
    if (!payload.agence_id) payload.agence_id = null

    const { error: err } = editing
      ? await supabase.from('clients').update(payload).eq('id', editing.id)
      : await supabase.from('clients').insert(payload)

    setSaving(false)
    if (err) { setError(err.message); return }
    setShowModal(false); load()
  }

  const toggleStatut = async (c) => {
    await supabase.from('clients').update({ statut: c.statut === 'actif' ? 'bloque' : 'actif' }).eq('id', c.id)
    load()
  }

  const openPrix = async (client) => {
    setShowPrix(client); setPrixSuccess('')
    const [{ data: pxCl }, { data: pxCat }] = await Promise.all([
      supabase.from('prix_clients').select('*').eq('client_id', client.id),
      supabase.from('prix_categories').select('*').eq('categorie_client_id', client.categorie_client_id),
    ])
    const mapCl = {}
    ;(pxCl ?? []).forEach(p => { mapCl[p.article_id] = p.prix })
    setPrixClient(mapCl)
    const mapCat = {}
    ;(pxCat ?? []).forEach(p => { mapCat[p.article_id] = p.prix })
    setPrixCategorie(mapCat)
  }

  const handlePrixChange = (artId, value) => {
    setPrixClient(prev => ({ ...prev, [artId]: value }))
  }

  const savePrixClient = async () => {
    setSavingPrix(true); setPrixSuccess('')
    for (const art of articles) {
      const val = prixClient[art.id]
      if (val === undefined || val === '' || val === null) {
        await supabase.from('prix_clients').delete().match({ client_id: showPrix.id, article_id: art.id })
      } else {
        await supabase.from('prix_clients').upsert(
          { client_id: showPrix.id, article_id: art.id, prix: Number(val) },
          { onConflict: 'client_id,article_id' }
        )
      }
    }
    setSavingPrix(false)
    setPrixSuccess('Prix enregistrés.')
    setTimeout(() => setPrixSuccess(''), 3000)
  }

  const grouped = {}
  articles.forEach(a => {
    if (!grouped[a.categorie]) grouped[a.categorie] = []
    grouped[a.categorie].push(a)
  })

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Clients</h2>
          <p className="text-sm text-gray-400">{filtered.length} client{filtered.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus size={18} /> Nouveau client
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, responsable, ville..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
        </div>
        <select value={filtreAgence} onChange={e => setFiltreAgence(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none">
          <option value="">Toutes les agences</option>
          {agences.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
        </select>
        <select value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none">
          <option value="">Toutes les catégories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <Loader2 className="animate-spin mb-2" /><p>Chargement...</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">Aucun client trouvé.</p>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {filtered.map(c => (
              <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-800">{c.nom_interne}</p>
                    {c.nom_responsable && <p className="text-xs text-gray-500">{c.nom_responsable}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {c.statut}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                  {c.agences?.nom && <span className="bg-gray-100 px-2 py-0.5 rounded">{c.agences.nom}</span>}
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{c.categories_clients?.nom}</span>
                  {c.ville && <span>{c.ville}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(c)} className="flex-1 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg">Modifier</button>
                  <button onClick={() => openPrix(c)} className="flex-1 py-2 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg">Prix</button>
                  <button onClick={() => toggleStatut(c)} className="py-2 px-3 text-xs font-medium text-gray-500 bg-gray-50 rounded-lg">
                    {c.statut === 'actif' ? 'Bloquer' : 'Activer'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b text-gray-600 uppercase text-xs">
                  <tr>
                    {['Nom interne','Responsable','Agence','Catégorie','Ville','Statut','Actions'].map(h => (
                      <th key={h} className="px-5 py-3 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-gray-800">{c.nom_interne}</td>
                      <td className="px-5 py-3 text-gray-600">{c.nom_responsable ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{c.agences?.nom ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{c.categories_clients?.nom}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{c.ville ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {c.statut}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Modifier"><Edit2 size={16} /></button>
                          <button onClick={() => openPrix(c)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Prix spécifiques"><DollarSign size={16} /></button>
                          <button onClick={() => toggleStatut(c)}
                            className={`p-1.5 rounded ${c.statut === 'actif' ? 'text-orange-500 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                            title="Changer statut"><ShieldAlert size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
            <h3 className="text-xl font-bold text-gray-800 mb-6">{editing ? 'Modifier le client' : 'Nouveau client'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom interne *</label>
                <input type="text" value={form.nom_interne} onChange={e => setForm({ ...form, nom_interne: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Responsable</label>
                  <input type="text" value={form.nom_responsable} onChange={e => setForm({ ...form, nom_responsable: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Téléphone</label>
                  <input type="text" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ville</label>
                  <input type="text" value={form.ville} onChange={e => setForm({ ...form, ville: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Localisation</label>
                  <input type="text" value={form.localisation} onChange={e => setForm({ ...form, localisation: e.target.value })}
                    placeholder="Point de vente..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Agence</label>
                  <select value={form.agence_id} onChange={e => setForm({ ...form, agence_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none">
                    <option value="">Sélectionner...</option>
                    {agences.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catégorie *</label>
                  <select value={form.categorie_client_id} onChange={e => setForm({ ...form, categorie_client_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" required>
                    <option value="">Sélectionner...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none" />
              </div>
              {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg">{error}</div>}
              <div className="flex gap-3 pt-4 pb-6 sm:pb-0">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPrix && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 pt-6 pb-3 border-b shrink-0">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{showPrix.nom_interne}</h3>
                  <p className="text-xs text-gray-400">Prix spécifiques — vide = prix catégorie par défaut</p>
                </div>
                <button onClick={() => setShowPrix(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {Object.entries(grouped).map(([cat, arts]) => (
                <div key={cat} className="mb-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{cat}</p>
                  <div className="space-y-2">
                    {arts.map(art => {
                      const catPrix = prixCategorie[art.id]
                      const clPrix = prixClient[art.id]
                      return (
                        <div key={art.id} className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 truncate">{art.nom}</p>
                            <p className="text-[10px] text-gray-400">Catégorie : {catPrix ? fmt(catPrix) : '—'}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <input type="number" min="0" placeholder={catPrix ?? '—'}
                              value={clPrix ?? ''}
                              onChange={e => handlePrixChange(art.id, e.target.value)}
                              className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none" />
                            <span className="text-[10px] text-gray-400 w-6">F</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between shrink-0">
              {prixSuccess ? <p className="text-green-600 text-xs font-medium">{prixSuccess}</p> : <span />}
              <button onClick={savePrixClient} disabled={savingPrix}
                className="px-5 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50">
                {savingPrix ? 'Enregistrement...' : 'Enregistrer les prix'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
