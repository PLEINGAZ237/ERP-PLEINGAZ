import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import MagasinLayout from '@/components/commercial/MagasinLayout'
import UploadJustificatif from '@/components/UploadJustificatif'
import { Loader2, ArrowDownToLine, ArrowUpFromLine, Lock, Package, AlertTriangle, CheckCircle } from 'lucide-react'

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

  // Saisie physique ouverture
  const [stocksOuverture, setStocksOuverture] = useState({})

  // Mouvements (entrée/sortie sur ordre)
  const [showMvt, setShowMvt] = useState(false)
  const [mvtForm, setMvtForm] = useState({ article_id: '', type: 'entree', motif: 'achat', quantite: '', description: '' })

  // Clôture
  const [showCloture, setShowCloture] = useState(false)
  const [stocksPhysiques, setStocksPhysiques] = useState({})

  const MOTIFS_ENTREE = [
    { value: 'achat', label: 'Achat (bon d\'achat)' },
    { value: 'retour_vehicule', label: 'Retour véhicule' },
    { value: 'retour_client', label: 'Retour client' },
    { value: 'transfert_recu', label: 'Transfert reçu' },
    { value: 'retour_reepreuve', label: 'Retour de réépreuve (usine)' },
    { value: 'deconsignation', label: 'Déconsignation' },
  ]
  const MOTIFS_SORTIE = [
    { value: 'livraison', label: 'Livraison commande client' },
    { value: 'chargement_vehicule', label: 'Sortie véhicule' },
    { value: 'transfert_envoye', label: 'Transfert vers autre agence' },
    { value: 'restitution_client', label: 'Restitution produit au client' },
    { value: 'publicite', label: 'Publicité (ordre DG)' },
    { value: 'sortie_reepreuve', label: 'Sortie pour réépreuve (usine)' },
  ]

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: mg }, { data: art }] = await Promise.all([
        supabase.from('magasins').select('id, nom').eq('statut', 'actif').order('nom'),
        supabase.from('articles').select('id, nom, categorie').eq('statut', 'actif').order('nom'),
      ])
      setMagasins(mg ?? [])
      setArticles(art ?? [])
      if (mg?.length > 0) setSelectedMagasin(mg[0].id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => { if (selectedMagasin) loadJournee() }, [selectedMagasin])

  const loadJournee = async () => {
    const { data: js } = await supabase.from('journees_stock')
      .select('*').eq('magasin_id', selectedMagasin)
      .in('statut', ['EN_ATTENTE_SAISIE', 'OUVERTE', 'CLOTUREE', 'VALIDEE'])
      .order('date_journee', { ascending: false }).limit(1).maybeSingle()

    setJournee(js)
    if (js) {
      const { data: lg } = await supabase.from('lignes_journee_stock')
        .select('*, articles(nom, categorie)').eq('journee_stock_id', js.id)
      setLignes(lg ?? [])
      const { data: mvts } = await supabase.from('mouvements_stock')
        .select('*, articles(nom), profiles!effectue_par(nom, prenom)')
        .eq('journee_stock_id', js.id).order('created_at', { ascending: false })
      setMouvements(mvts ?? [])

      // Pré-remplir les saisies
      const so = {}, sp = {}
      ;(lg ?? []).forEach(l => {
        so[l.article_id] = l.stock_physique_ouverture ?? ''
        sp[l.article_id] = l.stock_physique ?? ''
      })
      setStocksOuverture(so)
      setStocksPhysiques(sp)
    } else {
      setLignes([]); setMouvements([])
    }
  }

  // ── OUVRIR ──
  const handleOuvrir = async () => {
    setError(''); setSuccess(''); setSaving(true)
    const { data, error: err } = await supabase.rpc('ouvrir_journee_stock', { p_magasin_id: selectedMagasin })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess('Stock en attente de saisie physique.')
    loadJournee()
  }

  // ── CONFIRMER SAISIE PHYSIQUE ──
  const handleConfirmerOuverture = async () => {
    setError(''); setSaving(true)
    const stocks = lignes.map(l => ({
      article_id: l.article_id,
      stock_physique: Number(stocksOuverture[l.article_id] ?? l.stock_ouverture),
    }))
    const { data, error: err } = await supabase.rpc('confirmer_ouverture_stock', {
      p_journee_stock_id: journee.id,
      p_stocks: JSON.stringify(stocks),
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    if (data.statut === 'BLOQUE') {
      setError(`Écart de ${data.ecart_total} unités détecté. L'audit et le DG ont été notifiés. En attente de déblocage.`)
    } else {
      setSuccess('Stock ouvert — aucun écart.')
    }
    loadJournee()
  }

  // ── MOUVEMENT ──
  const handleMouvement = async () => {
    setError('')
    if (!mvtForm.article_id) { setError('Sélectionnez un article.'); return }
    if (!mvtForm.quantite || Number(mvtForm.quantite) <= 0) { setError('Quantité invalide.'); return }
    setSaving(true)
    const { error: err } = await supabase.rpc('enregistrer_mouvement_stock', {
      p_journee_stock_id: journee.id, p_article_id: mvtForm.article_id,
      p_type: mvtForm.type, p_motif: mvtForm.motif,
      p_quantite: Number(mvtForm.quantite), p_description: mvtForm.description || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(`${mvtForm.type === 'entree' ? 'Entrée' : 'Sortie'} enregistrée.`)
    setShowMvt(false)
    setMvtForm({ article_id: '', type: 'entree', motif: 'achat', quantite: '', description: '' })
    loadJournee()
  }

  // ── CLÔTURE ──
  const handleCloturer = async () => {
    setError(''); setSaving(true)
    for (const l of lignes) {
      const phys = stocksPhysiques[l.article_id]
      if (phys !== '' && phys !== null && phys !== undefined) {
        await supabase.from('lignes_journee_stock')
          .update({ stock_physique: Number(phys) }).eq('id', l.id)
      }
    }
    await supabase.from('journees_stock')
      .update({ statut: 'CLOTUREE', cloturee_par: user.id }).eq('id', journee.id)
    await supabase.rpc('notifier_cloture_stock', { p_journee_stock_id: journee.id })
    setSaving(false)
    setSuccess('Stock clôturé — chef d\'agence notifié pour validation.')
    setShowCloture(false)
    loadJournee()
  }

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
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none">
          {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

      {/* ── PAS DE JOURNÉE → OUVRIR ── */}
      {!journee && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Package size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">Aucune journée de stock ouverte pour ce magasin.</p>
          <button onClick={handleOuvrir} disabled={saving}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Ouverture...' : 'Ouvrir le stock'}
          </button>
        </div>
      )}

      {/* ── EN ATTENTE DE SAISIE PHYSIQUE ── */}
      {journee?.statut === 'EN_ATTENTE_SAISIE' && (
        <div className="space-y-4">
          <div className={`rounded-xl p-4 flex items-start gap-3 ${journee.ecart_bloque ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
            <AlertTriangle size={20} className={`shrink-0 mt-0.5 ${journee.ecart_bloque ? 'text-red-500' : 'text-amber-500'}`} />
            <div>
              <p className={`font-bold text-sm ${journee.ecart_bloque ? 'text-red-800' : 'text-amber-800'}`}>
                {journee.ecart_bloque ? 'Écart détecté — bloqué en attente audit + DG' : 'Saisie du stock physique d\'ouverture'}
              </p>
              <p className={`text-xs mt-1 ${journee.ecart_bloque ? 'text-red-600' : 'text-amber-600'}`}>
                {journee.ecart_bloque
                  ? 'Un écart a été détecté entre le stock théorique et votre comptage. L\'audit a été notifié.'
                  : 'Comptez chaque article et saisissez le stock physique. Le système comparera avec le stock théorique de la veille.'}
              </p>
            </div>
          </div>

          {!journee.ecart_bloque && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b"><h2 className="font-semibold text-gray-700 text-sm">Comptage physique d'ouverture</h2></div>
              <div className="divide-y divide-gray-50">
                {lignes.map(l => {
                  const theo = l.stock_ouverture
                  const phys = stocksOuverture[l.article_id]
                  const ecart = phys !== '' && phys !== undefined ? Number(phys) - theo : null
                  return (
                    <div key={l.id} className="px-5 py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700">{l.articles?.nom}</p>
                        <p className="text-[10px] text-gray-400">Stock théorique veille : {theo}</p>
                      </div>
                      <input type="number" min="0" value={stocksOuverture[l.article_id] ?? ''}
                        onChange={e => setStocksOuverture({ ...stocksOuverture, [l.article_id]: e.target.value })}
                        placeholder={theo.toString()}
                        className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center outline-none" />
                      {ecart !== null && ecart !== 0 && (
                        <span className={`text-xs font-bold ${ecart > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {ecart > 0 ? '+' : ''}{ecart}
                        </span>
                      )}
                      {ecart !== null && ecart === 0 && (
                        <CheckCircle size={16} className="text-green-500" />
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="px-5 py-3 border-t">
                <button onClick={handleConfirmerOuverture} disabled={saving}
                  className="w-full py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-50">
                  {saving ? 'Vérification...' : 'Confirmer le comptage et ouvrir'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── JOURNÉE OUVERTE ── */}
      {journee && ['OUVERTE', 'CLOTUREE', 'VALIDEE'].includes(journee.statut) && (
        <>
          <div className={`rounded-xl p-4 mb-6 flex items-center justify-between ${
            journee.statut === 'OUVERTE' ? 'bg-green-50 border border-green-200' :
            journee.statut === 'VALIDEE' ? 'bg-blue-50 border border-blue-200' :
            'bg-gray-100 border border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              {journee.statut === 'OUVERTE' ? <Package size={18} className="text-green-600" /> : <Lock size={18} className="text-gray-500" />}
              <div>
                <p className="font-bold text-gray-700 text-sm">
                  {journee.statut === 'OUVERTE' ? 'Stock ouvert' : journee.statut === 'VALIDEE' ? 'Stock validé' : 'Stock clôturé — en attente de validation'}
                </p>
                <p className="text-xs text-gray-400">{new Date(journee.date_journee).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
            {journee.statut === 'OUVERTE' && (
              <div className="flex gap-2">
                <button onClick={() => { setMvtForm({ ...mvtForm, type: 'entree', motif: 'achat' }); setShowMvt(true) }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">
                  <ArrowDownToLine size={14} /> Entrée
                </button>
                <button onClick={() => { setMvtForm({ ...mvtForm, type: 'sortie', motif: 'livraison' }); setShowMvt(true) }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">
                  <ArrowUpFromLine size={14} /> Sortie
                </button>
                <button onClick={() => setShowCloture(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-900">
                  <Lock size={14} /> Clôturer
                </button>
              </div>
            )}
          </div>

          {/* Tableau stock */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="px-5 py-3 border-b"><h2 className="font-semibold text-gray-700 text-sm">État du stock</h2></div>
            {lignes.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">Aucun article.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b"><tr>
                    {['Article', 'Ouverture', 'Entrées', 'Sorties', 'Théorique'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {Object.entries(groupedLignes).map(([cat, arts]) => [
                      <tr key={`cat-${cat}`}><td colSpan={5} className="px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">{cat}</td></tr>,
                      ...arts.map(l => {
                        const theo = l.stock_ouverture + l.total_entrees - l.total_sorties
                        return (
                          <tr key={l.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 font-medium text-gray-700">{l.articles?.nom}</td>
                            <td className="px-4 py-2.5 text-gray-500">{l.stock_ouverture}</td>
                            <td className="px-4 py-2.5 text-green-600 font-medium">{l.total_entrees > 0 ? `+${l.total_entrees}` : '—'}</td>
                            <td className="px-4 py-2.5 text-red-600 font-medium">{l.total_sorties > 0 ? `-${l.total_sorties}` : '—'}</td>
                            <td className="px-4 py-2.5 font-bold text-gray-800">{theo}</td>
                          </tr>
                        )
                      })
                    ])}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mouvements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b"><h2 className="font-semibold text-gray-700 text-sm">Mouvements du jour ({mouvements.length})</h2></div>
            {mouvements.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Aucun mouvement.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {mouvements.map(m => (
                  <div key={m.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{m.articles?.nom}</p>
                        <p className="text-xs text-gray-400">{(m.motif ?? '').replace(/_/g, ' ')} {m.description ? `· ${m.description}` : ''} · {m.profiles?.prenom} {m.profiles?.nom} · {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <p className={`font-bold ${m.type === 'entree' ? 'text-green-600' : 'text-red-600'}`}>{m.type === 'entree' ? '+' : '-'}{m.quantite}</p>
                    </div>
                    <UploadJustificatif tableRef="mouvements_stock" enregistrementId={m.id} />
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
              <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Article *</label>
                <select value={mvtForm.article_id} onChange={e => setMvtForm({ ...mvtForm, article_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none">
                  <option value="">Sélectionner...</option>
                  {articles.map(a => <option key={a.id} value={a.id}>{a.nom} ({a.categorie})</option>)}
                </select></div>
              <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Motif *</label>
                <select value={mvtForm.motif} onChange={e => setMvtForm({ ...mvtForm, motif: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none">
                  {(mvtForm.type === 'entree' ? MOTIFS_ENTREE : MOTIFS_SORTIE).map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select></div>
              <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Quantité *</label>
                <input type="number" min="1" value={mvtForm.quantite} onChange={e => setMvtForm({ ...mvtForm, quantite: e.target.value })}
                  placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" /></div>
              <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description / Référence</label>
                <input type="text" value={mvtForm.description} onChange={e => setMvtForm({ ...mvtForm, description: e.target.value })}
                  placeholder="N° bon, détails..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" /></div>
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
                const theo = l.stock_ouverture + l.total_entrees - l.total_sorties
                return (
                  <div key={l.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{l.articles?.nom}</p>
                      <p className="text-[10px] text-gray-400">Théorique : {theo}</p>
                    </div>
                    <input type="number" min="0" value={stocksPhysiques[l.article_id] ?? ''}
                      onChange={e => setStocksPhysiques({ ...stocksPhysiques, [l.article_id]: e.target.value })}
                      placeholder={theo.toString()}
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
