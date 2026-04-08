import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import MagasinLayout from '@/components/commercial/MagasinLayout'
import UploadJustificatif from '@/components/UploadJustificatif'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function RetoursVehicules() {
  const [retours, setRetours] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('retours_stock_vehicule')
      .select('*, articles(nom), sorties_vehicules(numero, vehicules(immatriculation)), profiles!retourne_par(nom, prenom)')
      .order('created_at', { ascending: false })
    setRetours(data ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleConfirmer = async (id) => {
    setSaving(id); const { error: err } = await supabase.rpc('confirmer_retour_stock_vehicule', { p_retour_id: id })
    setSaving(null); if (err) { setError(err.message); return }
    setSuccess('Retour confirmé — entrée stock.'); load()
  }
  const handleRejeter = async (id) => {
    setSaving(id); const { error: err } = await supabase.rpc('rejeter_retour_stock_vehicule', { p_retour_id: id, p_notes: 'Quantité non conforme' })
    setSaving(null); if (err) { setError(err.message); return }
    setSuccess('Retour rejeté.'); load()
  }

  if (loading) return <MagasinLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-green-500" size={28} /></div></MagasinLayout>
  const enAttente = retours.filter(r => r.statut === 'EN_ATTENTE'), traites = retours.filter(r => r.statut !== 'EN_ATTENTE')
  return (
    <MagasinLayout>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Retours stock véhicules</h1>
      <p className="text-sm text-gray-400 mb-6">Confirmez ou rejetez les retours des commerciaux.</p>
      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}
      {enAttente.length > 0 && <div className="mb-6"><h2 className="text-sm font-bold text-amber-600 uppercase mb-3">En attente ({enAttente.length})</h2><div className="space-y-3">{enAttente.map(r => (
        <div key={r.id} className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <p className="font-medium text-gray-800">{r.articles?.nom} — {r.quantite} unités</p>
          <p className="text-xs text-gray-400">{r.profiles?.prenom} {r.profiles?.nom} · {r.sorties_vehicules?.numero} · {r.sorties_vehicules?.vehicules?.immatriculation}</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => handleConfirmer(r.id)} disabled={saving === r.id} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold"><CheckCircle size={12} /> Confirmer</button>
            <button onClick={() => handleRejeter(r.id)} disabled={saving === r.id} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold"><XCircle size={12} /> Rejeter</button>
          </div>
          <UploadJustificatif tableRef="retours_stock_vehicule" enregistrementId={r.id} />
        </div>))}</div></div>}
      {traites.length === 0 && enAttente.length === 0 && <p className="text-gray-400 text-sm text-center py-12">Aucun retour.</p>}
      {traites.length > 0 && <><h2 className="text-sm font-bold text-gray-400 uppercase mb-3">Historique</h2><div className="space-y-2">{traites.map(r => (
        <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
          <div><p className="text-sm text-gray-700">{r.articles?.nom} — {r.quantite}</p><p className="text-xs text-gray-400">{r.profiles?.prenom} {r.profiles?.nom}</p></div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.statut === 'CONFIRME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.statut}</span>
        </div>))}</div></>}
    </MagasinLayout>
  )
}
