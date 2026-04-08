import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import VenteLayout from '@/components/commercial/VenteLayout'
import { Loader2, Wallet, Package, ArrowLeft } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function BouclerVente() {
  const { user } = useAuth()
  const [sortie, setSortie] = useState(null)
  const [lignes, setLignes] = useState([])
  const [caisses, setCaisses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState('versement')

  const [caisse_id, setCaisseId] = useState('')
  const [montant, setMontant] = useState('')
  const [retours, setRetours] = useState({})

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: sv }, { data: cs }] = await Promise.all([
        supabase.from('sorties_vehicules')
          .select('*, vehicules(immatriculation), lignes_sortie_vehicule(*, articles(nom))')
          .eq('vendeur_id', user.id).in('statut', ['EN_COURS', 'EN_VENTE', 'RETOUR'])
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('caisses').select('id, nom').eq('statut', 'actif').order('nom'),
      ])
      setSortie(sv)
      setLignes(sv?.lignes_sortie_vehicule ?? [])
      setCaisses(cs ?? [])
      const r = {}
      ;(sv?.lignes_sortie_vehicule ?? []).forEach(l => { r[l.article_id] = 0 })
      setRetours(r)
      setLoading(false)
    }
    load()
  }, [])

  const handleVersement = async () => {
    if (!caisse_id || !montant || Number(montant) <= 0) { setError('Sélectionnez une caisse et un montant.'); return }
    setError(''); setSaving(true)
    const { error: err } = await supabase.rpc('verser_en_caisse', { p_sortie_id: sortie.id, p_caisse_id: caisse_id, p_montant: Number(montant) })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(`Versement de ${fmt(Number(montant))} envoyé — en attente de validation par la caissière.`)
    setMontant('')
  }

  const handleRetour = async () => {
    const items = Object.entries(retours).filter(([_, q]) => q > 0).map(([article_id, quantite]) => ({ article_id, quantite }))
    if (items.length === 0) { setError('Indiquez les quantités à retourner.'); return }
    setError(''); setSaving(true)
    const { error: err } = await supabase.rpc('retour_vehicule', { p_sortie_vehicule_id: sortie.id, p_retours: items })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess('Retour stock enregistré.')
  }

  const handleBoucler = async () => {
    setError(''); setSaving(true)
    const { error: err } = await supabase.rpc('boucler_sortie_vehicule', { p_sortie_vehicule_id: sortie.id })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess('Sortie véhicule bouclée !')
  }

  if (loading) return <VenteLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-purple-500" size={28} /></div></VenteLayout>

  if (!sortie) return (
    <VenteLayout>
      <p className="text-gray-400 text-sm text-center py-20">Aucune sortie véhicule active.</p>
    </VenteLayout>
  )

  return (
    <VenteLayout>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Boucler ma vente</h1>
      <p className="text-sm text-gray-400 mb-6">Versez votre caisse et retournez le stock restant.</p>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('versement')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'versement' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
          <Wallet size={14} className="inline mr-1" /> Versement caisse
        </button>
        <button onClick={() => setTab('retour')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'retour' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
          <Package size={14} className="inline mr-1" /> Retour stock
        </button>
      </div>

      {tab === 'versement' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-4">Verser à la caisse principale</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Caisse *</label>
              <select value={caisse_id} onChange={e => setCaisseId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none">
                <option value="">Sélectionner...</option>
                {caisses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Montant *</label>
              <input type="number" min="0" value={montant} onChange={e => setMontant(e.target.value)}
                placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" />
            </div>
          </div>
          <button onClick={handleVersement} disabled={saving}
            className="mt-4 w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50">
            {saving ? 'Envoi...' : 'Envoyer le versement'}
          </button>
        </div>
      )}

      {tab === 'retour' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-4">Retourner le stock restant</h2>
          <div className="space-y-2 mb-4">
            {lignes.map(l => {
              const restant = l.quantite_sortie - l.quantite_vendue - l.quantite_retour
              return (
                <div key={l.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">{l.articles?.nom}</p>
                    <p className="text-[10px] text-gray-400">Restant : {restant}</p>
                  </div>
                  <input type="number" min="0" max={restant} value={retours[l.article_id] || ''}
                    onChange={e => setRetours({ ...retours, [l.article_id]: Math.min(restant, parseInt(e.target.value) || 0) })}
                    placeholder="0" className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center outline-none" />
                </div>
              )
            })}
          </div>
          <button onClick={handleRetour} disabled={saving}
            className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50 mb-3">
            {saving ? 'Enregistrement...' : 'Enregistrer le retour'}
          </button>
          {sortie.statut === 'RETOUR' && (
            <button onClick={handleBoucler} disabled={saving}
              className="w-full py-3 bg-gray-800 text-white rounded-xl text-sm font-bold hover:bg-gray-900 disabled:opacity-50">
              Boucler la sortie véhicule
            </button>
          )}
        </div>
      )}
    </VenteLayout>
  )
}
