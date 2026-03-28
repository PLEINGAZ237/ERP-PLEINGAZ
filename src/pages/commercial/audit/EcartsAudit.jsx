import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AuditLayout from '@/components/commercial/AuditLayout'
import { Loader2, CheckCircle, Wallet, Package } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function EcartsAudit() {
  const [ecartsCaisse, setEcartsCaisse] = useState([])
  const [ecartsStock, setEcartsStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [justification, setJustification] = useState('')
  const [showModal, setShowModal] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async () => {
    setLoading(true)
    const [{ data: jc }, { data: js }] = await Promise.all([
      supabase.from('journees_caisse').select('*, caisses(nom), profiles!ouverte_par(nom, prenom)')
        .eq('ecart_bloque', true).order('date_journee', { ascending: false }),
      supabase.from('journees_stock').select('*, magasins(nom), profiles!ouverte_par(nom, prenom)')
        .eq('ecart_bloque', true).order('date_journee', { ascending: false }),
    ])
    setEcartsCaisse(jc ?? [])
    setEcartsStock(js ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleValider = async () => {
    if (!justification.trim()) { setError('La justification est obligatoire.'); return }
    setError(''); setSaving(showModal.id)
    const { error: err } = await supabase.rpc('valider_ecart', {
      p_type: showModal.type,
      p_journee_id: showModal.id,
      p_justification: justification,
    })
    setSaving(null)
    if (err) { setError(err.message); return }
    setSuccess('Écart validé et débloqué.')
    setShowModal(null)
    setJustification('')
    load()
  }

  if (loading) return <AuditLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-purple-500" size={28} /></div></AuditLayout>

  return (
    <AuditLayout>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Écarts à valider</h1>
      <p className="text-sm text-gray-400 mb-6">Analysez et justifiez les écarts bloquants pour débloquer les opérations.</p>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

      <h2 className="font-bold text-gray-700 text-sm flex items-center gap-2 mb-3"><Wallet size={16} className="text-amber-500" /> Écarts caisse ({ecartsCaisse.length})</h2>
      {ecartsCaisse.length === 0 ? (
        <p className="text-gray-400 text-sm mb-6">Aucun écart caisse bloqué.</p>
      ) : (
        <div className="space-y-3 mb-8">
          {ecartsCaisse.map(jc => (
            <div key={jc.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{jc.caisses?.nom}</p>
                <p className="text-xs text-gray-400">{new Date(jc.date_journee).toLocaleDateString('fr-FR')} · {jc.profiles?.prenom} {jc.profiles?.nom}</p>
                <p className="text-sm mt-1">Solde clôture : {fmt(jc.solde_cloture)} — <span className="font-bold text-red-600">Écart : {fmt(jc.ecart)}</span></p>
              </div>
              <button onClick={() => setShowModal({ id: jc.id, type: 'caisse', nom: jc.caisses?.nom, ecart: jc.ecart })}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700">
                <CheckCircle size={12} /> Analyser
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-bold text-gray-700 text-sm flex items-center gap-2 mb-3"><Package size={16} className="text-green-500" /> Écarts stock ({ecartsStock.length})</h2>
      {ecartsStock.length === 0 ? (
        <p className="text-gray-400 text-sm">Aucun écart stock bloqué.</p>
      ) : (
        <div className="space-y-3">
          {ecartsStock.map(js => (
            <div key={js.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{js.magasins?.nom}</p>
                <p className="text-xs text-gray-400">{new Date(js.date_journee).toLocaleDateString('fr-FR')} · {js.profiles?.prenom} {js.profiles?.nom}</p>
              </div>
              <button onClick={() => setShowModal({ id: js.id, type: 'stock', nom: js.magasins?.nom })}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700">
                <CheckCircle size={12} /> Analyser
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Valider l'écart</h3>
            <p className="text-sm text-gray-500 mb-4">{showModal.nom} — {showModal.type === 'caisse' ? `Écart : ${fmt(showModal.ecart)}` : 'Écart de stock'}</p>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Justification / Explication *</label>
              <textarea value={justification} onChange={e => setJustification(e.target.value)}
                placeholder="Décrivez la raison de l'écart et les mesures prises..."
                rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none resize-none" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowModal(null); setJustification('') }}
                className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Annuler</button>
              <button onClick={handleValider} disabled={saving === showModal.id}
                className="flex-1 py-2.5 text-sm bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50">
                {saving === showModal.id ? 'Validation...' : 'Valider et débloquer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuditLayout>
  )
}
