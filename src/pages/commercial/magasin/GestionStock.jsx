import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import MagasinLayout from '@/components/commercial/MagasinLayout'
import { Loader2, Plus, ArrowDownToLine, ArrowUpFromLine, Lock, Unlock, Package } from 'lucide-react'

export default function GestionStock() {
  const { user } = useAuth()
  const [magasins, setMagasins] = useState([])
  const [selectedMagasin, setSelectedMagasin] = useState('')
  const [journee, setJournee] = useState(null)
  const [lignes, setLignes] = useState([])
  const [mouvements, setMouvements] = useState([])
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showMvt, setShowMvt] = useState(false)
  const [mvtForm, setMvtForm] = useState({ article_id: '', type: 'entree', motif: 'approvisionnement', quantite: '', description: '' })
  const [showCloture, setShowCloture] = useState(false)
  const [stocksPhysiques, setStocksPhysiques] = useState({})

  const MOTIFS_ENTREE = [
    { value: 'approvisionnement', label: 'Approvisionnement' },
    { value: 'retour_vehicule', label: 'Retour véhicule' },
    { value: 'retour_client', label: 'Retour client' },
    { value: 'ajustement_plus', label: 'Ajustement (+)' },
  ]
  const MOTIFS_SORTIE = [
    { value: 'vente', label: 'Vente' },
    { value: 'livraison', label: 'Livraison client' },
    { value: 'chargement_vehicule', label: 'Chargement véhicule' },
    { value: 'casse', label: 'Casse / perte' },
    { value: 'ajustement_moins', label: 'Ajustement (-)' },
  ]

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: mg }, { data: art }] = await Promise.all([
        supabase.from('magasins').select('id, nom').eq('statut', 'actif').order('nom'),
        supabase.from('articles').select('id, nom, categorie').eq('statut', 'actif').order('categorie, nom'),
      ])
      setMagasins(mg ?? [])
      setArticles(art ?? [])
      if (mg?.length > 0) setSelectedMagasin(mg[0].id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (selectedMagasin) loadJournee()
  }, [selectedMagasin])

  const loadJournee = async () => {
    const { data: js } = await supabase
      .from('journees_stock')
      .select('*')
      .eq('magasin_id', selectedMagasin)
      .eq('date_journee', new Date().toISOString().slice(0, 10))
      .maybeSingle()
    setJournee(js)

    if (js) {
      const { data: lg } = await supabase
        .from('lignes_journee_stock')
        .select('*, articles(nom, categorie)')
        .eq('journee_stock_id', js.id)
        .order('articles(categorie), articles(nom)')
      setLignes(lg ?? [])

      const { data: mvts } = await supabase
        .from('mouvements_stock')
        .select('*, articles(nom), profiles!effectue_par(nom, prenom)')
        .eq('journee_stock_id', js.id)
        .order('created_at', { ascending: false })
      setMouvements(mvts ?? [])

      const sp = {}
      ;(lg ?? []).forEach(l => { sp[l.article_id] = l.stock_physique ?? (l.stock_ouverture + l.total_entrees - l.total_sorties) })
      setStocksPhysiques(sp)
    } else {
      setLignes([])
      setMouvements([])
    }
  }

  const handleOuvrir = async () => {
    setError(''); setSaving(true)
    const { data, error: err } = await supabase.rpc('ouvrir_journee_stock', { p_magasin_id: selectedMagasin })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess('Stock ouvert pour aujourd\'hui.')
    loadJournee()
  }

  const handleMouvement = async () => {
    setError('')
    if (!mvtForm.article_id) { setError('Sélectionnez un article.'); return }
    if (!mvtForm.quantite || Number(mvtForm.quantite) <= 0) { setError('Quantité invalide.'); return }
    setSaving(true)

    const { data, error: err } = await supabase.rpc('enregistrer_mouvement_stock', {
      p_journee_stock_id: journee.id,
      p_article_id: mvtForm.article_id,
      p_type: mvtForm.type,
      p_motif: mvtForm.motif,
      p_quantite: Number(mvtForm.quantite),
      p_description: mvtForm.description || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(`${mvtForm.type === 'entree' ? 'Entrée' : 'Sortie'} de ${mvtForm.quantite} unités enregistrée.`)
    setShowMvt(false)
    setMvtForm({ article_id: '', type: 'entree', motif: 'approvisionnement', quantite: '', description: '' })
    loadJournee()
  }

  const handleCloturer = async () => {
    setError(''); setSaving(true)
    const stocks = Object.entries(stocksPhysiques).map(([article_id, stock_physique]) => ({ article_id, stock_physique: Number(stock_physique) }))
    const { data, error: err } = await supabase.rpc('cloturer_journee_stock', {
      p_journee_stock_id: journee.id,
      p_stocks_physiques: stocks,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(`Stock clôturé. Écarts totaux : ${data.total_ecarts} unités.`)
    setShowCloture(false)
    loadJournee()
  }

  const CAT_LABELS = { GPL: 'GPL', CONSIGNE: 'Consigne', ACCESSOIRE: 'Accessoire' }

  const groupedLignes = {}
  lignes.forEach(l => {
    const cat = l.articles?.categorie ?? 'Autre'
    if (!groupedLignes[cat]) groupedLignes[cat] = []
    groupedLignes[cat].push(l)
  })

  if (loading) return <MagasinLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-green-500" size={28} /></div></MagasinLayout>

  return (
    <MagasinLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Gestion de stock</h1>
          <p className="text-sm text-gray-400">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <select value={selectedMagasin} onChange={e => setSelectedMagasin(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500/20">
          {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

      {!journee ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Package size={32} className="mx-auto text-green-500 mb-4" />
          <h2 className="font-bold text-gray-800 text-lg mb-2">Stock non ouvert</h2>
          <p className="text-sm text-gray-400 mb-6">Ouvrez le stock pour commencer les opérations du jour.</p>
          <button onClick={handleOuvrir} disabled={saving}
            className="px-6 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Ouverture...' : 'Ouvrir le stock'}
          </button>
        </div>
      ) : (
        <>
          {/* Actions */}
          {journee.statut === 'OUVERTE' && (
            <div className="flex flex-wrap gap-3 mb-6">
              <button onClick={() => { setMvtForm({ ...mvtForm, type: 'entree', motif: 'approvisionnement' }); setShowMvt(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700">
                <ArrowDownToLine size={16} /> Entrée de stock
              </button>
              <button onClick={() => { setMvtForm({ ...mvtForm, type: 'sortie', motif: 'vente' }); setShowMvt(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700">
                <ArrowUpFromLine size={16} /> Sortie de stock
              </button>
              <button onClick={() => setShowCloture(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-bold hover:bg-gray-900 ml-auto">
                <Lock size={16} /> Clôturer
              </button>
            </div>
          )}

          {journee.statut === 'CLOTUREE' && (
            <div className="bg-gray-100 rounded-xl p-4 mb-6 flex items-center gap-3">
              <Lock size={18} className="text-gray-500" />
              <p className="font-bold text-gray-700 text-sm">Stock clôturé pour aujourd'hui</p>
            </div>
          )}

          {/* Tableau de stock */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="px-5 py-3 border-b">
              <h2 className="font-semibold text-gray-700 text-sm">État du stock</h2>
            </div>
            {lignes.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">Aucun article.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Article', 'Ouverture', 'Entrées', 'Sorties', 'Théorique', 'Écart'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Object.entries(groupedLignes).map(([cat, arts]) => (
                      <>
                        <tr key={cat}><td colSpan={6} className="px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">{CAT_LABELS[cat] ?? cat}</td></tr>
                        {arts.map(l => {
                          const theorique = l.stock_ouverture + l.total_entrees - l.total_sorties
                          const ecart = (l.stock_physique ?? theorique) - theorique
                          return (
                            <tr key={l.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-2.5 font-medium text-gray-700">{l.articles?.nom}</td>
                              <td className="px-4 py-2.5 text-gray-500">{l.stock_ouverture}</td>
                              <td className="px-4 py-2.5 text-green-600 font-medium">{l.total_entrees > 0 ? `+${l.total_entrees}` : '—'}</td>
                              <td className="px-4 py-2.5 text-red-600 font-medium">{l.total_sorties > 0 ? `-${l.total_sorties}` : '—'}</td>
                              <td className="px-4 py-2.5 font-bold text-gray-800">{theorique}</td>
                              <td className={`px-4 py-2.5 font-bold ${ecart !== 0 ? (ecart > 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>
                                {ecart !== 0 ? (ecart > 0 ? `+${ecart}` : ecart) : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mouvements du jour */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b">
              <h2 className="font-semibold text-gray-700 text-sm">Mouvements du jour</h2>
            </div>
            {mouvements.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Aucun mouvement.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {mouvements.map(m => (
                  <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{m.articles?.nom}</p>
                      <p className="text-xs text-gray-400">{m.motif.replace(/_/g, ' ')} · {m.description ?? ''} · {m.profiles?.prenom} {m.profiles?.nom} · {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <p className={`font-bold ${m.type === 'entree' ? 'text-green-600' : 'text-red-600'}`}>
                      {m.type === 'entree' ? '+' : '-'}{m.quantite}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Mouvement */}
      {showMvt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{mvtForm.type === 'entree' ? 'Entrée de stock' : 'Sortie de stock'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Article *</label>
                <select value={mvtForm.article_id} onChange={e => setMvtForm({ ...mvtForm, article_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none">
                  <option value="">Sélectionner...</option>
                  {articles.map(a => <option key={a.id} value={a.id}>{a.nom} ({a.categorie})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Motif *</label>
                <select value={mvtForm.motif} onChange={e => setMvtForm({ ...mvtForm, motif: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none">
                  {(mvtForm.type === 'entree' ? MOTIFS_ENTREE : MOTIFS_SORTIE).map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Quantité *</label>
                <input type="number" min="1" value={mvtForm.quantite} onChange={e => setMvtForm({ ...mvtForm, quantite: e.target.value })}
                  placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                <input type="text" value={mvtForm.description} onChange={e => setMvtForm({ ...mvtForm, description: e.target.value })}
                  placeholder="Détails..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowMvt(false)} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Annuler</button>
              <button onClick={handleMouvement} disabled={saving}
                className="flex-1 py-2.5 text-sm bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Enregistrement...' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Clôture */}
      {showCloture && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Clôturer le stock</h3>
            <p className="text-sm text-gray-500 mb-4">Saisissez le comptage physique pour chaque article :</p>
            <div className="space-y-2 mb-5">
              {lignes.map(l => {
                const theorique = l.stock_ouverture + l.total_entrees - l.total_sorties
                return (
                  <div key={l.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{l.articles?.nom}</p>
                      <p className="text-[10px] text-gray-400">Théorique : {theorique}</p>
                    </div>
                    <input type="number" min="0" value={stocksPhysiques[l.article_id] ?? ''}
                      onChange={e => setStocksPhysiques({ ...stocksPhysiques, [l.article_id]: e.target.value })}
                      placeholder={theorique.toString()}
                      className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center outline-none" />
                  </div>
                )
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCloture(false)} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Annuler</button>
              <button onClick={handleCloturer} disabled={saving}
                className="flex-1 py-2.5 text-sm bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 disabled:opacity-50">
                {saving ? 'Clôture...' : 'Clôturer le stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MagasinLayout>
  )
}
