import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import CaisseLayout from '@/components/commercial/CaisseLayout'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function VersementsCommerciaux() {
  const [versements, setVersements] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filtre, setFiltre] = useState('EN_ATTENTE')

  const load = async () => {
    setLoading(true)
    const { data, error: err } = await supabase.from('versements_commerciaux')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) console.error('versements error:', err)
    setVersements(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAction = async (id, action) => {
    setSaving(id); setError('')
    const { error: err } = await supabase.rpc('valider_versement_commercial', { p_versement_id: id, p_action: action })
    setSaving(null)
    if (err) { setError(err.message); return }
    setSuccess(action === 'valide' ? 'Versement validé — encaissement créé.' : 'Versement rejeté.')
    load()
  }

  const filtered = filtre ? versements.filter(v => v.statut === filtre) : versements

  if (loading) return <CaisseLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></CaisseLayout>

  return (
    <CaisseLayout>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Versements commerciaux</h1>
      <p className="text-sm text-gray-400 mb-6">Validez les versements des commerciaux dans votre caisse.</p>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

      <div className="flex gap-2 mb-5">
        {[{ v: 'EN_ATTENTE', l: 'En attente' }, { v: 'VALIDE', l: 'Validés' }, { v: '', l: 'Tous' }].map(f => (
          <button key={f.v} onClick={() => setFiltre(f.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filtre === f.v ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {f.l} {f.v === 'EN_ATTENTE' ? `(${versements.filter(v => v.statut === 'EN_ATTENTE').length})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">Aucun versement.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(v => (
            <div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-medium text-gray-800">Commercial</p>
                  <p className="text-xs text-gray-400">{new Date(v.created_at).toLocaleDateString('fr-FR')} {new Date(v.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                  {v.notes && <p className="text-xs text-gray-500 mt-1">{v.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-800">{fmt(v.montant)}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    v.statut === 'EN_ATTENTE' ? 'bg-amber-100 text-amber-700' :
                    v.statut === 'VALIDE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>{v.statut}</span>
                </div>
              </div>
              {v.statut === 'EN_ATTENTE' && (
                <div className="flex gap-2">
                  <button onClick={() => handleAction(v.id, 'valide')} disabled={saving === v.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50">
                    <CheckCircle size={12} /> Valider
                  </button>
                  <button onClick={() => handleAction(v.id, 'rejete')} disabled={saving === v.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50">
                    <XCircle size={12} /> Rejeter
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </CaisseLayout>
  )
}
