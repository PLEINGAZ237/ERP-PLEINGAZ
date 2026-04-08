import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ControleurFluxLayout from '@/components/commercial/ControleurFluxLayout'
import { Loader2, CheckCircle } from 'lucide-react'

export default function ValidationsSorties() {
  const [validations, setValidations] = useState([])
  const [mouvements, setMouvements] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [comptage, setComptage] = useState({})

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('mouvements_stock')
      .select('*, articles(nom), journees_stock(magasin_id, magasins(nom, est_centre_enfuteur)), profiles!effectue_par(nom, prenom)')
      .eq('type', 'sortie')
      .order('created_at', { ascending: false }).limit(50)
    setMouvements((data ?? []).filter(m => m.journees_stock?.magasins?.est_centre_enfuteur))
    const { data: v } = await supabase.from('validations_flux')
      .select('*').eq('type', 'sortie').order('created_at', { ascending: false }).limit(50)
    setValidations(v ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const validerSortie = async (mvt) => {
    const qte = Number(comptage[mvt.id] ?? mvt.quantite)
    setSaving(mvt.id); setError('')
    const { error: err } = await supabase.from('validations_flux').insert({
      type: 'sortie', magasin_id: mvt.journees_stock?.magasin_id,
      mouvement_stock_id: mvt.id, quantite_declaree: mvt.quantite,
      quantite_comptee: qte, valide: qte === mvt.quantite,
      controleur_id: (await supabase.auth.getUser()).data.user?.id,
    })
    setSaving(null)
    if (err) { setError(err.message); return }
    setSuccess(qte === mvt.quantite ? 'Sortie validée — quantité conforme.' : `Écart détecté : compté ${qte} au lieu de ${mvt.quantite}.`)
    load()
  }

  const dejaValide = (mvtId) => validations.some(v => v.mouvement_stock_id === mvtId)

  if (loading) return <ControleurFluxLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></ControleurFluxLayout>

  return (
    <ControleurFluxLayout>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Validations sorties</h1>
      <p className="text-sm text-gray-400 mb-6">Comptez et validez les sorties après le magasinier (centre enfûteur).</p>
      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

      {mouvements.length === 0 ? <p className="text-gray-400 text-sm text-center py-12">Aucune sortie à valider.</p> : (
        <div className="space-y-3">
          {mouvements.map(m => (
            <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-gray-800">{m.articles?.nom} — {m.quantite} unités</p>
                  <p className="text-xs text-gray-400">{(m.motif ?? '').replace(/_/g, ' ')} · {m.journees_stock?.magasins?.nom} · {m.profiles?.prenom} {m.profiles?.nom}</p>
                  <p className="text-xs text-gray-400">{new Date(m.created_at).toLocaleString('fr-FR')}</p>
                </div>
                {dejaValide(m.id) ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Validé</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">À valider</span>
                )}
              </div>
              {!dejaValide(m.id) && (
                <div className="flex items-center gap-3 mt-3">
                  <input type="number" min="0" value={comptage[m.id] ?? ''} onChange={e => setComptage({ ...comptage, [m.id]: e.target.value })}
                    placeholder={m.quantite.toString()} className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center outline-none" />
                  <button onClick={() => validerSortie(m)} disabled={saving === m.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50">
                    <CheckCircle size={12} /> Valider le comptage
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ControleurFluxLayout>
  )
}
