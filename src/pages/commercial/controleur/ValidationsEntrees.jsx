import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ControleurFluxLayout from '@/components/commercial/ControleurFluxLayout'
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

export default function ValidationsEntrees() {
  const [mouvements, setMouvements] = useState([])
  const [validations, setValidations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [comptage, setComptage] = useState({})

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('mouvements_stock')
      .select('*, articles(id, nom), journees_stock(magasin_id, magasins(nom, est_centre_enfuteur))').eq('type', 'entree')
      .order('created_at', { ascending: false }).limit(50)
    setMouvements((data ?? []).filter(m => m.journees_stock?.magasins?.est_centre_enfuteur))
    const { data: v } = await supabase.from('validations_flux').select('*').eq('type', 'entree').order('created_at', { ascending: false }).limit(50)
    setValidations(v ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const validerEntree = async (mvt) => {
    const qte = Number(comptage[mvt.id] ?? mvt.quantite)
    setSaving(mvt.id); setError('')
    const { data, error: err } = await supabase.rpc('valider_flux_entree', {
      p_magasin_id: mvt.journees_stock?.magasin_id, p_article_id: mvt.articles?.id,
      p_quantite_declaree: mvt.quantite, p_quantite_comptee: qte, p_mouvement_stock_id: mvt.id,
    })
    setSaving(null)
    if (err) { setError(err.message); return }
    if (data?.ecart) setError(`Écart détecté (déclaré ${mvt.quantite}, compté ${qte}). Bloqué — DG et audit notifiés.`)
    else setSuccess('Entrée validée — conforme.')
    load()
  }

  const dejaValide = (id) => validations.some(v => v.mouvement_stock_id === id)
  const getVal = (id) => validations.find(v => v.mouvement_stock_id === id)

  if (loading) return <ControleurFluxLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></ControleurFluxLayout>
  return (
    <ControleurFluxLayout>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Validations entrées</h1>
      <p className="text-sm text-gray-400 mb-6">Comptez et validez les entrées avant le magasinier.</p>
      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}
      {mouvements.length === 0 ? <p className="text-gray-400 text-sm text-center py-12">Aucune entrée.</p> : (
        <div className="space-y-3">{mouvements.map(m => {
          const val = getVal(m.id)
          return (
            <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-gray-800">{m.articles?.nom} — {m.quantite} unités</p>
                  <p className="text-xs text-gray-400">{(m.motif ?? '').replace(/_/g, ' ')} · {m.journees_stock?.magasins?.nom} · {new Date(m.created_at).toLocaleString('fr-FR')}</p>
                </div>
                {val ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${val.bloque ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{val.bloque ? 'BLOQUÉ' : 'Validé'}</span>
                  : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">À valider</span>}
              </div>
              {val?.bloque && <div className="bg-red-50 rounded-lg p-2 mb-2 flex items-center gap-2"><AlertTriangle size={14} className="text-red-500" /><p className="text-xs text-red-700">Écart : déclaré {val.quantite_declaree}, compté {val.quantite_comptee}. Attente DG.</p></div>}
              {!dejaValide(m.id) && (
                <div className="flex items-center gap-3 mt-3">
                  <input type="number" min="0" value={comptage[m.id] ?? ''} onChange={e => setComptage({ ...comptage, [m.id]: e.target.value })}
                    placeholder={m.quantite.toString()} className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center outline-none" />
                  <button onClick={() => validerEntree(m)} disabled={saving === m.id} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"><CheckCircle size={12} /> Valider</button>
                </div>
              )}
            </div>)
        })}</div>
      )}
    </ControleurFluxLayout>
  )
}
