import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DGCommLayout from '@/components/commercial/DGCommLayout'
import { Loader2, Plus, CheckCircle, XCircle, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'

export default function Inventaires({ Layout = DGCommLayout }) {
  const [inventaires, setInventaires] = useState([])
  const [magasins, setMagasins] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreer, setShowCreer] = useState(false)
  const [magasinId, setMagasinId] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [lignesDetail, setLignesDetail] = useState({})

  const load = async () => {
    setLoading(true)
    const [{ data: inv }, { data: mg }] = await Promise.all([
      supabase.from('inventaires').select('*, magasins(nom), profiles!initie_par(nom, prenom), profiles!valide_par(nom, prenom)').order('created_at', { ascending: false }),
      supabase.from('magasins').select('id, nom').eq('statut', 'actif').order('nom'),
    ])
    setInventaires(inv ?? [])
    setMagasins(mg ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreer = async () => {
    if (!magasinId) { setError('Sélectionnez un magasin.'); return }
    setError(''); setSaving(true)
    const { data, error: err } = await supabase.rpc('creer_inventaire', { p_magasin_id: magasinId })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(`Inventaire ${data.numero} créé.`)
    setShowCreer(false)
    load()
  }

  const toggleExpand = async (invId) => {
    if (expanded === invId) { setExpanded(null); return }
    setExpanded(invId)
    if (!lignesDetail[invId]) {
      const { data } = await supabase.from('lignes_inventaire')
        .select('*, articles(nom, categorie)')
        .eq('inventaire_id', invId)
        .order('articles(categorie), articles(nom)')
      setLignesDetail(prev => ({ ...prev, [invId]: data ?? [] }))
    }
  }

  const updateStockPhysique = (invId, ligneId, value) => {
    setLignesDetail(prev => ({
      ...prev,
      [invId]: (prev[invId] ?? []).map(l => l.id === ligneId ? { ...l, stock_physique: value === '' ? null : Number(value) } : l)
    }))
  }

  const handleSauvegarder = async (invId) => {
    setSaving(true)
    const lignes = lignesDetail[invId] ?? []
    for (const l of lignes) {
      if (l.stock_physique !== null && l.stock_physique !== undefined) {
        await supabase.from('lignes_inventaire').update({ stock_physique: l.stock_physique }).eq('id', l.id)
      }
    }
    await supabase.from('inventaires').update({ statut: 'TERMINE' }).eq('id', invId)
    setSaving(false)
    setSuccess('Inventaire sauvegardé et marqué comme terminé.')
    load()
  }

  const handleValider = async (invId, action) => {
    setError(''); setSaving(true)
    const { data, error: err } = await supabase.rpc('valider_inventaire', { p_inventaire_id: invId, p_action: action })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(action === 'valide' ? 'Inventaire validé.' : 'Inventaire annulé.')
    load()
  }

  const STATUT_STYLE = {
    EN_COURS: 'bg-amber-100 text-amber-700', TERMINE: 'bg-blue-100 text-blue-700',
    VALIDE: 'bg-green-100 text-green-700', ANNULE: 'bg-gray-200 text-gray-500',
  }

  if (loading) return <Layout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></Layout>

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Inventaires</h1>
          <p className="text-sm text-gray-400">Inventaires physiques par magasin.</p>
        </div>
        <button onClick={() => setShowCreer(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700">
          <Plus size={16} /> Nouvel inventaire
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

      {inventaires.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">Aucun inventaire.</p>
      ) : (
        <div className="space-y-3">
          {inventaires.map(inv => {
            const isOpen = expanded === inv.id
            return (
              <div key={inv.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50" onClick={() => toggleExpand(inv.id)}>
                  <div>
                    <p className="font-mono text-xs text-green-600">{inv.numero}</p>
                    <p className="font-bold text-gray-800 text-sm">{inv.magasins?.nom}</p>
                    <p className="text-xs text-gray-400">{new Date(inv.date_inventaire).toLocaleDateString('fr-FR')} · Par {inv.profiles?.prenom} {inv.profiles?.nom}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUT_STYLE[inv.statut]}`}>{inv.statut.replace(/_/g, ' ')}</span>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t px-5 py-4 bg-gray-50/50">
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-xs">
                        <thead className="bg-white border-b">
                          <tr>
                            {['Article', 'Stock théorique', 'Stock physique', 'Écart', 'Justification'].map(h => (
                              <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(lignesDetail[inv.id] ?? []).map(l => {
                            const ecart = (l.stock_physique ?? 0) - l.stock_theorique
                            return (
                              <tr key={l.id} className={l.stock_physique !== null && ecart !== 0 ? 'bg-red-50/50' : ''}>
                                <td className="px-3 py-2 font-medium text-gray-700">{l.articles?.nom}</td>
                                <td className="px-3 py-2 text-gray-600">{l.stock_theorique}</td>
                                <td className="px-3 py-2">
                                  {inv.statut === 'EN_COURS' ? (
                                    <input type="number" min="0" value={l.stock_physique ?? ''}
                                      onChange={e => updateStockPhysique(inv.id, l.id, e.target.value)}
                                      placeholder={l.stock_theorique.toString()}
                                      className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-center outline-none text-xs" />
                                  ) : (
                                    <span className="font-bold">{l.stock_physique ?? '—'}</span>
                                  )}
                                </td>
                                <td className={`px-3 py-2 font-bold ${l.stock_physique !== null && ecart !== 0 ? (ecart > 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>
                                  {l.stock_physique !== null ? (ecart !== 0 ? (ecart > 0 ? `+${ecart}` : ecart) : '—') : '—'}
                                </td>
                                <td className="px-3 py-2 text-gray-500">{l.justification ?? '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {inv.statut === 'EN_COURS' && (
                      <button onClick={() => handleSauvegarder(inv.id)} disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Sauvegarde...' : 'Terminer l\'inventaire'}
                      </button>
                    )}

                    {inv.statut === 'TERMINE' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleValider(inv.id, 'valide')} disabled={saving}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50">
                          <CheckCircle size={12} /> Valider
                        </button>
                        <button onClick={() => handleValider(inv.id, 'rejete')} disabled={saving}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50">
                          <XCircle size={12} /> Annuler
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showCreer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Nouvel inventaire</h3>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Magasin *</label>
            <select value={magasinId} onChange={e => setMagasinId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none mb-4">
              <option value="">Sélectionner...</option>
              {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowCreer(false)} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Annuler</button>
              <button onClick={handleCreer} disabled={saving}
                className="flex-1 py-2.5 text-sm bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
