import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import CaisseLayout from '@/components/commercial/CaisseLayout'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function TransfertsCaisse() {
  const { user } = useAuth()
  const [transferts, setTransferts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('mouvements_caisse')
      .select('*, journees_caisse(caisse_id, caisses(nom)), profiles!effectue_par(nom, prenom)')
      .eq('type', 'transfert_in')
      .not('confirmation_statut', 'is', null)
      .order('created_at', { ascending: false })
    setTransferts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAction = async (id, action) => {
    setSaving(id); setError('')
    const { error: err } = await supabase.rpc('confirmer_transfert_caisse', { p_mouvement_id: id, p_action: action })
    setSaving(null)
    if (err) { setError(err.message); return }
    setSuccess(action === 'confirme' ? 'Transfert confirmé — montant ajouté à votre caisse.' : 'Transfert rejeté — montant retourné à la caisse source.')
    load()
  }

  const enAttente = transferts.filter(t => t.confirmation_statut === 'EN_ATTENTE')
  const traites = transferts.filter(t => t.confirmation_statut !== 'EN_ATTENTE')

  if (loading) return <CaisseLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></CaisseLayout>

  return (
    <CaisseLayout>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Transferts reçus</h1>
      <p className="text-sm text-gray-400 mb-6">Confirmez ou rejetez les transferts reçus d'autres caisses.</p>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

      {enAttente.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-amber-600 uppercase mb-3">En attente de confirmation ({enAttente.length})</h2>
          <div className="space-y-3">
            {enAttente.map(t => (
              <div key={t.id} className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium text-gray-800">{t.description ?? 'Transfert entrant'}</p>
                    <p className="text-xs text-gray-400">{t.profiles?.prenom} {t.profiles?.nom} · {new Date(t.created_at).toLocaleDateString('fr-FR')} {new Date(t.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <p className="text-lg font-bold text-amber-700">{fmt(t.montant)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAction(t.id, 'confirme')} disabled={saving === t.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50">
                    <CheckCircle size={12} /> Confirmer le montant
                  </button>
                  <button onClick={() => handleAction(t.id, 'rejete')} disabled={saving === t.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50">
                    <XCircle size={12} /> Rejeter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-sm font-bold text-gray-400 uppercase mb-3">Historique</h2>
      {traites.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">Aucun transfert traité.</p>
      ) : (
        <div className="space-y-2">
          {traites.map(t => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-700">{t.description ?? 'Transfert'}</p>
                <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-800">{fmt(t.montant)}</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.confirmation_statut === 'CONFIRME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {t.confirmation_statut}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </CaisseLayout>
  )
}
