import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import CommLayout from '@/components/commercial/CommLayout'
import { Search, Plus, Trash2, Loader2, ArrowLeft, ShoppingCart } from 'lucide-react'

const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' F'
const CAT_LABELS = { GPL: 'GPL', CONSIGNE: 'Consigne', ACCESSOIRE: 'Accessoire' }

export default function CreerCommande({ Layout = CommLayout, backPath = '/commercial/comm' }) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [clients, setClients] = useState([])
  const [articles, setArticles] = useState([])
  const [agences, setAgences] = useState([])
  const [searchClient, setSearchClient] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [filtreAgence, setFiltreAgence] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [agenceId, setAgenceId] = useState('')
  const [lignes, setLignes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [step, setStep] = useState(1)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: cl }, { data: art }, { data: ag }] = await Promise.all([
        supabase.from('clients').select('id, nom_interne, nom_responsable, ville, categorie_client_id, categories_clients(nom), agences(nom)').eq('statut', 'actif').order('nom_interne'),
        supabase.from('articles').select('*').eq('statut', 'actif').order('categorie, nom'),
        supabase.from('agences').select('id, nom').eq('statut', 'actif').order('nom'),
      ])
      setClients(cl ?? [])
      setArticles(art ?? [])
      setAgences(ag ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const categories = useMemo(() => [...new Set(clients.map(c => c.categories_clients?.nom).filter(Boolean))].sort(), [clients])
  const agencesClient = useMemo(() => [...new Set(clients.map(c => c.agences?.nom).filter(Boolean))].sort(), [clients])

  const filteredClients = useMemo(() => {
    let result = clients
    if (filtreCategorie) result = result.filter(c => c.categories_clients?.nom === filtreCategorie)
    if (filtreAgence) result = result.filter(c => c.agences?.nom === filtreAgence)
    if (searchClient.trim()) {
      const q = searchClient.toLowerCase()
      result = result.filter(c => c.nom_interne.toLowerCase().includes(q) || c.nom_responsable?.toLowerCase().includes(q) || c.ville?.toLowerCase().includes(q))
    }
    return result.slice(0, 30)
  }, [clients, searchClient, filtreCategorie, filtreAgence])

  const selectClient = async (client) => {
    setSelectedClient(client)
    setStep(2)
    const prixMap = {}
    for (const art of articles) {
      const { data } = await supabase.rpc('get_prix_client', { p_client_id: client.id, p_article_id: art.id })
      prixMap[art.id] = data ?? 0
    }
    setLignes(articles.map(a => ({ article_id: a.id, nom: a.nom, categorie: a.categorie, quantite: 0, prix_unitaire: prixMap[a.id] ?? 0 })))
  }

  const updateQty = (artId, qty) => setLignes(prev => prev.map(l => l.article_id === artId ? { ...l, quantite: Math.max(0, parseInt(qty) || 0) } : l))
  const removeLigne = (artId) => setLignes(prev => prev.filter(l => l.article_id !== artId))
  const lignesActives = lignes.filter(l => l.quantite > 0)
  const total = lignesActives.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)

  const handleSubmit = async () => {
    setError('')
    if (!selectedClient) { setError('Veuillez sélectionner un client.'); return }
    if (lignesActives.length === 0) { setError('Ajoutez au moins un article avec une quantité.'); return }

    // Validation consigne : une consigne ne peut être vendue que si le GPL du même type est acheté pour la même quantité ou plus
    const consigneTypes = ['50KG', '12.5KG', '6KG']
    for (const type of consigneTypes) {
      const consigneLigne = lignesActives.find(l => {
        const art = articles.find(a => a.id === l.article_id)
        return art?.nom === `CONSIGNE ${type}`
      })
      if (consigneLigne && consigneLigne.quantite > 0) {
        const gplLigne = lignesActives.find(l => {
          const art = articles.find(a => a.id === l.article_id)
          return art?.nom === `GPL ${type}`
        })
        const gplQty = gplLigne?.quantite ?? 0
        if (gplQty < consigneLigne.quantite) {
          setError(`Impossible de vendre ${consigneLigne.quantite} CONSIGNE ${type} sans au moins ${consigneLigne.quantite} GPL ${type} (vous avez ${gplQty} GPL ${type}). La vente d'une bouteille vide est interdite.`)
          return
        }
      }
    }

    setSaving(true)
    const { data, error: rpcErr } = await supabase.rpc('creer_commande', {
      p_client_id: selectedClient.id, p_agence_id: agenceId || null,
      p_lignes: lignesActives.map(l => ({ article_id: l.article_id, quantite: l.quantite })),
    })
    setSaving(false)
    if (rpcErr) { setError(rpcErr.message); return }
    setSuccess(`Commande ${data.numero} créée !`)
    setTimeout(() => navigate(backPath), 2000)
  }

  const grouped = {}
  articles.forEach(a => { if (!grouped[a.categorie]) grouped[a.categorie] = []; grouped[a.categorie].push(a) })

  if (loading) return <Layout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-blue-500" size={28} /></div></Layout>

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => step === 1 ? navigate(backPath) : setStep(step - 1)} className="text-blue-600 hover:underline text-sm flex items-center gap-1"><ArrowLeft size={16} /> Retour</button>
          <h1 className="text-xl font-bold text-gray-800">Nouvelle commande</h1>
        </div>
        <div className="flex gap-2 mb-6">{[1, 2, 3].map(s => (<div key={s} className={`flex-1 h-1.5 rounded-full ${step >= s ? 'bg-blue-500' : 'bg-gray-200'}`} />))}</div>

        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-4">Sélectionner un client</h2>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchClient} onChange={e => setSearchClient(e.target.value)} placeholder="Rechercher par nom, responsable, ville..."
                className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" autoFocus />
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <select value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none">
                <option value="">Toutes catégories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filtreAgence} onChange={e => setFiltreAgence(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none">
                <option value="">Toutes agences</option>
                {agencesClient.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <span className="text-xs text-gray-400 self-center">{filteredClients.length} client{filteredClients.length > 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredClients.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Aucun client trouvé. Essayez un autre filtre.</p>
              ) : (
                filteredClients.map(c => (
                <div key={c.id} onClick={() => selectClient(c)} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-all">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{c.nom_interne}</p>
                    <p className="text-xs text-gray-400">
                      <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium mr-1">{c.categories_clients?.nom}</span>
                      {c.agences?.nom ?? ''} {c.ville ? `· ${c.ville}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-blue-500 font-bold shrink-0">Choisir →</span>
                </div>
                ))
              )}
            </div>
          </div>
        )}

        {step === 2 && selectedClient && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-center justify-between">
              <div><p className="font-bold text-blue-800">{selectedClient.nom_interne}</p><p className="text-xs text-blue-600">{selectedClient.categories_clients?.nom}</p></div>
              <button onClick={() => setStep(1)} className="text-xs text-blue-500 underline">Changer</button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-4">Articles et quantités</h2>
              {Object.entries(grouped).map(([cat, arts]) => (
                <div key={cat} className="mb-5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{CAT_LABELS[cat]}</p>
                  <div className="space-y-2">
                    {arts.map(art => {
                      const ligne = lignes.find(l => l.article_id === art.id)
                      if (!ligne) return null
                      return (
                        <div key={art.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-700">{ligne.nom}</p></div>
                          <input type="number" min="0" value={ligne.quantite || ''} onChange={e => updateQty(art.id, e.target.value)} placeholder="Qté"
                            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500/20 outline-none" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div className="border-t pt-4 mt-4 flex items-center justify-between">
                <div><p className="text-xs text-gray-400">{lignesActives.length} article{lignesActives.length > 1 ? 's' : ''}</p></div>
                <button onClick={() => { if (lignesActives.length === 0) { setError('Ajoutez des quantités.'); return } setError(''); setStep(3) }}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">Continuer →</button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && selectedClient && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-4">Récapitulatif</h2>
              <div className="bg-gray-50 rounded-xl p-4 mb-4"><p className="text-xs text-gray-400 mb-1">Client</p><p className="font-bold text-gray-800">{selectedClient.nom_interne}</p></div>
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Agence</label>
                <select value={agenceId} onChange={e => setAgenceId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none">
                  <option value="">— Sélectionner —</option>
                  {agences.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                </select>
              </div>
              <div className="divide-y divide-gray-100">
                {lignesActives.map(l => (
                  <div key={l.article_id} className="flex items-center justify-between py-2.5">
                    <p className="text-sm font-medium text-gray-700">{l.nom}</p>
                    <p className="font-bold text-gray-800">× {l.quantite}</p>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 mt-2 flex items-center justify-between"><p className="text-xs text-gray-400 uppercase font-bold">{lignesActives.length} article{lignesActives.length > 1 ? 's' : ''}</p></div>
            </div>
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>}
            {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl">{success}</div>}
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 font-bold">← Modifier</button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <ShoppingCart size={16} /> {saving ? 'Création...' : 'Créer la commande'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
