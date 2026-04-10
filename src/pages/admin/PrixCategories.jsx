import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/admin/AdminLayout'
import { Loader2, Save, CheckCircle, Search, Users, Factory } from 'lucide-react'

const fmt = (n) => n != null && n !== '' ? Number(n).toLocaleString('fr-FR') + ' F' : '—'
const CAT_LABELS = { GPL: 'GPL', CONSIGNE: 'Consigne', ACCESSOIRE: 'Accessoire' }

export default function PrixCategories() {
  const [categories, setCategories] = useState([])
  const [articles, setArticles] = useState([])
  const [clients, setClients] = useState([])
  const [prixCat, setPrixCat] = useState({})
  const [prixCentre, setPrixCentre] = useState({})
  const [prixClients, setPrixClients] = useState({})
  const [selectedClient, setSelectedClient] = useState(null)
  const [searchClient, setSearchClient] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [onglet, setOnglet] = useState('centre')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: cats }, { data: arts }, { data: pxCentre }, { data: cl }, { data: pxCl }, { data: pxCatData }] = await Promise.all([
        supabase.from('categories_clients').select('*').eq('statut', 'actif').order('nom'),
        supabase.from('articles').select('*').eq('statut', 'actif').order('categorie, nom'),
        supabase.from('prix_centre_enfuteur').select('*'),
        supabase.from('clients').select('id, nom_interne, ville, categories_clients(id, nom)').order('nom_interne'),
        supabase.from('prix_clients').select('*'),
        supabase.from('prix_categories').select('*'),
      ])
      setCategories(cats ?? [])
      setArticles(arts ?? [])
      setClients(cl ?? [])

      const centreMap = {}
      ;(pxCentre ?? []).forEach(p => { centreMap[p.article_id] = p.prix })
      setPrixCentre(centreMap)

      const clMap = {}
      ;(pxCl ?? []).forEach(p => { clMap[`${p.client_id}_${p.article_id}`] = p.prix })
      setPrixClients(clMap)

      const catMap = {}
      ;(pxCatData ?? []).forEach(p => { catMap[`${p.categorie_client_id}_${p.article_id}`] = p.prix })
      setPrixCat(catMap)

      setLoading(false)
    }
    load()
  }, [])

  const grouped = {}
  articles.forEach(a => { if (!grouped[a.categorie]) grouped[a.categorie] = []; grouped[a.categorie].push(a) })

  // --- Centre enfûteur ---
  const savePrixCentre = async () => {
    setSaving(true); setError(''); setSuccess('')
    for (const art of articles.filter(a => a.categorie === 'GPL')) {
      const val = prixCentre[art.id]
      if (val === undefined || val === '') continue
      const { error: err } = await supabase.from('prix_centre_enfuteur').upsert({ article_id: art.id, prix: Number(val) }, { onConflict: 'article_id' })
      if (err) { setError(err.message); setSaving(false); return }
    }
    setSaving(false); setSuccess('Prix centre enfûteur enregistrés.')
    setTimeout(() => setSuccess(''), 3000)
  }

  // --- Par client ---
  const savePrixClient = async () => {
    if (!selectedClient) return
    setSaving(true); setError(''); setSuccess('')
    for (const art of articles) {
      const key = `${selectedClient}_${art.id}`
      const val = prixClients[key]
      if (val === undefined || val === '') {
        await supabase.from('prix_clients').delete().eq('client_id', selectedClient).eq('article_id', art.id)
      } else {
        const { error: err } = await supabase.from('prix_clients').upsert(
          { client_id: selectedClient, article_id: art.id, prix: Number(val) },
          { onConflict: 'client_id,article_id' }
        )
        if (err) { setError(err.message); setSaving(false); return }
      }
    }
    const nom = clients.find(c => c.id === selectedClient)?.nom_interne
    setSaving(false); setSuccess(`Prix spécifiques pour ${nom} enregistrés.`)
    setTimeout(() => setSuccess(''), 3000)
  }

  // Prix catégorie d'un client (pour afficher le défaut)
  const getPrixDefaut = (clientId, artId) => {
    const client = clients.find(c => c.id === clientId)
    if (!client?.categories_clients?.id) return null
    return prixCat[`${client.categories_clients.id}_${artId}`]
  }

  const filteredClients = searchClient.trim()
    ? clients.filter(c => c.nom_interne.toLowerCase().includes(searchClient.toLowerCase()) || c.ville?.toLowerCase().includes(searchClient.toLowerCase())).slice(0, 20)
    : clients.slice(0, 20)

  const clientObj = clients.find(c => c.id === selectedClient)

  if (loading) return <AdminLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></AdminLayout>

  return (
    <AdminLayout>
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Grille de prix</h2>
        <p className="text-sm text-gray-400">Prix centre enfûteur et prix spécifiques par client.</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setOnglet('centre')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            onglet === 'centre' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
          }`}><Factory size={15} /> Centre enfûteur</button>
        <button onClick={() => setOnglet('client')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            onglet === 'client' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
          }`}><Users size={15} /> Par client</button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4 border border-red-100">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl mb-4 border border-emerald-100 flex items-center gap-2"><CheckCircle size={14} /> {success}</div>}

      {/* ═══ Centre enfûteur ═══ */}
      {onglet === 'centre' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50/50">
            <h3 className="font-semibold text-gray-700 text-sm">Prix centre enfûteur</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Appliqué quand le magasin Magzi ou Dibamba est sélectionné à la facturation.</p>
          </div>
          {articles.filter(a => a.categorie === 'GPL').map(art => (
            <div key={art.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 border-b border-gray-50">
              <span className="text-sm text-gray-700 font-medium">{art.nom}</span>
              <div className="flex items-center gap-2">
                <input type="number" min="0" placeholder="0" value={prixCentre[art.id] ?? ''}
                  onChange={e => setPrixCentre(prev => ({ ...prev, [art.id]: e.target.value }))}
                  className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right outline-none focus:border-blue-400" />
                <span className="text-[10px] text-gray-400 w-10">FCFA</span>
              </div>
            </div>
          ))}
          <div className="px-5 py-4 border-t bg-gray-50/50 flex justify-end">
            <button onClick={savePrixCentre} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-sm">
              <Save size={15} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Par client ═══ */}
      {onglet === 'client' && (
        <div className="space-y-4">
          {/* Recherche */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <Search size={16} className="text-gray-400" />
              <input type="text" value={searchClient} onChange={e => { setSearchClient(e.target.value); setSelectedClient(null) }}
                placeholder="Rechercher un client par nom ou ville..." className="flex-1 text-sm outline-none placeholder:text-gray-300" />
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {filteredClients.map(cl => (
                <button key={cl.id} onClick={() => { setSelectedClient(cl.id); setSearchClient('') }}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    selectedClient === cl.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-blue-300'
                  }`}>
                  {cl.nom_interne} <span className="opacity-50 ml-1">· {cl.categories_clients?.nom ?? '—'}</span>
                </button>
              ))}
              {filteredClients.length === 0 && <p className="text-gray-400 text-xs py-2">Aucun client trouvé.</p>}
            </div>
          </div>

          {/* Grille prix */}
          {selectedClient && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b bg-gray-50/50">
                <h3 className="font-semibold text-gray-700 text-sm">
                  Prix spécifiques : <span className="text-blue-600">{clientObj?.nom_interne}</span>
                  <span className="text-gray-400 font-normal ml-2">({clientObj?.categories_clients?.nom ?? '—'})</span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Laissez vide → prix de la catégorie. Un prix ici remplace le prix catégorie pour ce client.</p>
              </div>
              {Object.entries(grouped).map(([cat, arts]) => (
                <div key={cat}>
                  <div className="px-5 py-2 bg-gray-100/50"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{CAT_LABELS[cat]}</span></div>
                  {arts.map(art => {
                    const key = `${selectedClient}_${art.id}`
                    const defaut = getPrixDefaut(selectedClient, art.id)
                    const specifique = prixClients[key]
                    const hasOverride = specifique !== undefined && specifique !== ''
                    return (
                      <div key={art.id} className={`flex items-center justify-between px-5 py-3 border-b border-gray-50 ${hasOverride ? 'bg-blue-50/40' : 'hover:bg-gray-50/50'}`}>
                        <div>
                          <span className="text-sm text-gray-700 font-medium">{art.nom}</span>
                          <p className="text-[10px] text-gray-400">
                            Catégorie : {defaut ? fmt(defaut) : 'non défini'}
                            {hasOverride && <span className="text-blue-600 font-bold ml-2">→ prix modifié</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" placeholder={defaut ? defaut.toString() : '0'}
                            value={prixClients[key] ?? ''}
                            onChange={e => setPrixClients(prev => ({ ...prev, [key]: e.target.value }))}
                            className={`w-32 border rounded-lg px-3 py-2 text-sm text-right outline-none transition-colors ${
                              hasOverride ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                            } focus:border-blue-400`} />
                          <span className="text-[10px] text-gray-400 w-10">FCFA</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              <div className="px-5 py-4 border-t bg-gray-50/50 flex items-center justify-between">
                <p className="text-[11px] text-gray-400">Champs vides = prix catégorie utilisé</p>
                <button onClick={savePrixClient} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-sm">
                  <Save size={15} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          {!selectedClient && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <Users size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">Sélectionnez un client pour modifier ses prix.</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  )
}
