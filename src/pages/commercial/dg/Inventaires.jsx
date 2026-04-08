import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DGCommLayout from '@/components/commercial/DGCommLayout'
import { Loader2, Plus, CheckCircle, Package, Wallet, ChevronDown, ChevronUp } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') : '—'
const STATUT_STYLE = { EN_COURS: 'bg-amber-100 text-amber-700', ECART_DETECTE: 'bg-red-100 text-red-700', VALIDE: 'bg-blue-100 text-blue-700', CLOTURE: 'bg-green-100 text-green-700' }

export default function InventairesPage({ Layout = DGCommLayout, canCreate = true, canValidate = false }) {
  const [inventaires, setInventaires] = useState([])
  const [magasins, setMagasins] = useState([])
  const [caisses, setCaisses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreer, setShowCreer] = useState(false)
  const [createType, setCreateType] = useState('stock')
  const [selectedId, setSelectedId] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [lignesDetail, setLignesDetail] = useState({})

  const load = async () => {
    setLoading(true)
    const [{ data: inv }, { data: mg }, { data: cs }] = await Promise.all([
      supabase.from('inventaires').select('*, magasins(nom), caisses(nom), profiles!initie_par(nom, prenom)').order('created_at', { ascending: false }),
      supabase.from('magasins').select('id, nom').eq('statut', 'actif').order('nom'),
      supabase.from('caisses').select('id, nom').eq('statut', 'actif').order('nom'),
    ])
    setInventaires(inv ?? []); setMagasins(mg ?? []); setCaisses(cs ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleCreer = async () => {
    if (!selectedId) { setError('Sélectionnez.'); return }
    setError(''); setSaving(true)
    const { data, error: err } = await supabase.rpc(createType === 'stock' ? 'initier_inventaire_stock' : 'initier_inventaire_caisse',
      createType === 'stock' ? { p_magasin_id: selectedId } : { p_caisse_id: selectedId })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess('Inventaire créé.'); setShowCreer(false); setSelectedId(''); load()
  }

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!lignesDetail[id]) {
      const { data } = await supabase.from('lignes_inventaire').select('*, articles(nom, categorie)').eq('inventaire_id', id)
      setLignesDetail(prev => ({ ...prev, [id]: data ?? [] }))
    }
  }

  const updatePhysique = (invId, ligneId, field, value) => {
    setLignesDetail(prev => ({ ...prev, [invId]: (prev[invId] ?? []).map(l => l.id === ligneId ? { ...l, [field]: value === '' ? null : Number(value) } : l) }))
  }

  const handleSoumettre = async (inv) => {
    setSaving(true); setError('')
    const lignes = lignesDetail[inv.id] ?? []
    const comptages = inv.type === 'stock'
      ? lignes.filter(l => l.stock_physique != null).map(l => ({ article_id: l.article_id, stock_physique: l.stock_physique }))
      : lignes.filter(l => l.solde_physique != null).map(l => ({ ligne_id: l.id, solde_physique: l.solde_physique }))
    const { data, error: err } = await supabase.rpc('soumettre_inventaire', { p_inventaire_id: inv.id, p_comptages: comptages })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(data?.statut === 'ECART_DETECTE' ? `Écart de ${fmt(data.ecart_total)} — DG notifié.` : 'Aucun écart — validé.'); load()
  }

  const handleValider = async (id) => {
    const justif = prompt('Justification :')
    if (!justif) return
    setSaving(true)
    const { error: err } = await supabase.rpc('valider_inventaire', { p_inventaire_id: id, p_justification: justif })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess('Inventaire validé — stock reporté. Magasinier notifié.'); load()
  }

  if (loading) return <Layout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></Layout>
  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-xl font-bold text-gray-800">Inventaires</h1><p className="text-sm text-gray-400">Stock et caisse.</p></div>
        {canCreate && <button onClick={() => setShowCreer(true)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700"><Plus size={16} /> Nouvel inventaire</button>}
      </div>
      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}
      {inventaires.length === 0 ? <p className="text-gray-400 text-sm text-center py-12">Aucun inventaire.</p> : (
        <div className="space-y-3">{inventaires.map(inv => {
          const isOpen = expanded === inv.id, lignes = lignesDetail[inv.id] ?? [], isStock = inv.type === 'stock'
          return (
            <div key={inv.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50" onClick={() => toggleExpand(inv.id)}>
                <div className="flex items-center gap-3">
                  {isStock ? <Package size={16} className="text-green-500" /> : <Wallet size={16} className="text-amber-500" />}
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{isStock ? inv.magasins?.nom : inv.caisses?.nom} — {inv.type}</p>
                    <p className="text-xs text-gray-400">{new Date(inv.created_at).toLocaleDateString('fr-FR')} · {inv.profiles?.prenom} {inv.profiles?.nom}</p>
                    {inv.ecart_total > 0 && <p className="text-xs font-bold text-red-600">Écart : {fmt(inv.ecart_total)}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUT_STYLE[inv.statut] ?? 'bg-gray-100'}`}>{inv.statut?.replace(/_/g, ' ')}</span>
                  {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>
              {isOpen && (
                <div className="border-t px-5 py-4 bg-gray-50/50">
                  {isStock ? (
                    <div className="overflow-x-auto mb-4"><table className="w-full text-xs"><thead className="bg-white border-b"><tr>
                      {['Article', 'Théorique', 'Physique', 'Écart'].map(h => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase">{h}</th>)}
                    </tr></thead><tbody className="divide-y divide-gray-100">
                      {lignes.map(l => {
                        const ecart = l.stock_physique != null ? l.stock_physique - l.stock_theorique : null
                        return (<tr key={l.id} className={ecart != null && ecart !== 0 ? 'bg-red-50/50' : ''}>
                          <td className="px-3 py-2 font-medium text-gray-700">{l.articles?.nom ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{l.stock_theorique}</td>
                          <td className="px-3 py-2">{inv.statut === 'EN_COURS' ? <input type="number" min="0" value={l.stock_physique ?? ''} onChange={e => updatePhysique(inv.id, l.id, 'stock_physique', e.target.value)} placeholder={l.stock_theorique?.toString()} className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-center outline-none text-xs" /> : <span className="font-bold">{l.stock_physique ?? '—'}</span>}</td>
                          <td className={`px-3 py-2 font-bold ${ecart != null && ecart !== 0 ? (ecart > 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>{ecart != null && ecart !== 0 ? (ecart > 0 ? `+${ecart}` : ecart) : '—'}</td>
                        </tr>)
                      })}
                    </tbody></table></div>
                  ) : (
                    <div className="mb-4">{lignes.map(l => (
                      <div key={l.id} className="flex items-center gap-4 bg-white rounded-lg p-4">
                        <div className="flex-1"><p className="text-sm text-gray-500">Solde théorique</p><p className="text-lg font-bold text-gray-800">{fmt(l.solde_theorique)} F</p></div>
                        <div className="flex-1"><p className="text-sm text-gray-500">Solde physique</p>
                          {inv.statut === 'EN_COURS' ? <input type="number" min="0" value={l.solde_physique ?? ''} onChange={e => updatePhysique(inv.id, l.id, 'solde_physique', e.target.value)} className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" /> : <p className="text-lg font-bold">{fmt(l.solde_physique)} F</p>}
                        </div>
                      </div>
                    ))}</div>
                  )}
                  {inv.statut === 'EN_COURS' && canCreate && <button onClick={() => handleSoumettre(inv)} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50">{saving ? 'Soumission...' : 'Soumettre'}</button>}
                  {inv.statut === 'ECART_DETECTE' && canValidate && <button onClick={() => handleValider(inv.id)} disabled={saving} className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 disabled:opacity-50"><CheckCircle size={12} /> Valider (reporter le physique)</button>}
                  {inv.statut === 'VALIDE' && canValidate && <button onClick={() => handleValider(inv.id)} disabled={saving} className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold"><CheckCircle size={12} /> Clôturer</button>}
                  {inv.justification && <p className="text-xs text-gray-500 mt-3">Justification : {inv.justification}</p>}
                </div>
              )}
            </div>)
        })}</div>
      )}
      {showCreer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Nouvel inventaire</h3>
            <div className="flex gap-2 mb-4">
              <button onClick={() => { setCreateType('stock'); setSelectedId('') }} className={`flex-1 py-2 rounded-lg text-sm font-medium ${createType === 'stock' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}><Package size={14} className="inline mr-1" /> Stock</button>
              <button onClick={() => { setCreateType('caisse'); setSelectedId('') }} className={`flex-1 py-2 rounded-lg text-sm font-medium ${createType === 'caisse' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'}`}><Wallet size={14} className="inline mr-1" /> Caisse</button>
            </div>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none mb-2">
              <option value="">Sélectionner...</option>
              {(createType === 'stock' ? magasins : caisses).map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
            <p className="text-xs text-gray-400 mb-4">Uniquement à la clôture ou avant l'ouverture.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCreer(false)} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Annuler</button>
              <button onClick={handleCreer} disabled={saving} className="flex-1 py-2.5 text-sm bg-purple-600 text-white rounded-xl font-bold">{saving ? 'Création...' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
