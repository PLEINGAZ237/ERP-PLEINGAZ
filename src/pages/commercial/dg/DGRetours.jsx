import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DGCommLayout from '@/components/commercial/DGCommLayout'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

const STATUT_STYLE = { EN_ATTENTE_DG: 'bg-amber-100 text-amber-700', VALIDE: 'bg-green-100 text-green-700', VALIDE_DG: 'bg-green-100 text-green-700', REJETE: 'bg-red-100 text-red-700' }

export default function DGRetours({ Layout = DGCommLayout }) {
  const [retours, setRetours] = useState([])
  const [decons, setDecons] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState('retours')
  const [decision, setDecision] = useState('')

  const load = async () => {
    setLoading(true)
    const [{ data: r }, { data: d }] = await Promise.all([
      supabase.from('retours_produits').select('*, agences(nom), magasins(nom), clients(nom_interne), profiles!initie_par(nom, prenom)').order('created_at', { ascending: false }),
      supabase.from('deconsignations').select('*, agences(nom), magasins(nom), clients(nom_interne), profiles!initie_par(nom, prenom)').order('created_at', { ascending: false }),
    ])
    setRetours(r ?? []); setDecons(d ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleRetour = async (id, action) => {
    setSaving(id); setError('')
    const { error: err } = await supabase.rpc('traiter_retour_produit', { p_retour_id: id, p_action: action, p_decision: decision || null })
    setSaving(null)
    if (err) { setError(err.message); return }
    setSuccess(action === 'valide' ? 'Retour validé — magasinier notifié.' : 'Retour rejeté.')
    setDecision(''); load()
  }

  const handleDecon = async (id, action) => {
    setSaving(id); setError('')
    const { error: err } = await supabase.rpc('valider_deconsignation', { p_deconsignation_id: id, p_action: action })
    setSaving(null)
    if (err) { setError(err.message); return }
    setSuccess(action === 'valide' ? 'Déconsignation validée — COMM notifié pour émettre le besoin.' : 'Déconsignation rejetée.')
    load()
  }

  const retAttente = retours.filter(r => r.statut === 'EN_ATTENTE_DG')
  const decAttente = decons.filter(d => d.statut === 'EN_ATTENTE_DG')

  if (loading) return <Layout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></Layout>

  return (
    <Layout>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Retours & Déconsignations</h1>
      <p className="text-sm text-gray-400 mb-6">Validez les retours produits et les déconsignations.</p>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('retours')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'retours' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
          Retours ({retAttente.length})
        </button>
        <button onClick={() => setTab('decons')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'decons' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
          Déconsignations ({decAttente.length})
        </button>
      </div>

      {tab === 'retours' && (retours.length === 0 ? <p className="text-gray-400 text-sm text-center py-12">Aucun retour.</p> : (
        <div className="space-y-3">
          {retours.map(r => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-mono text-xs text-blue-600">{r.numero}</p>
                  <p className="font-medium text-gray-800">{r.type_retour} {r.type_bouteille ? `(${r.type_bouteille})` : ''} × {r.quantite}</p>
                  <p className="text-xs text-gray-400">{r.clients?.nom_interne ?? '—'} · {r.agences?.nom} · Par {r.profiles?.prenom} {r.profiles?.nom}</p>
                  <p className="text-xs text-gray-500 mt-1">Motif : {r.motif_retour}</p>
                  {r.constat && <p className="text-xs text-gray-500">Constat : {r.constat}</p>}
                  {r.poids_constate && <p className="text-xs text-gray-500">Poids : {r.poids_constate} kg</p>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUT_STYLE[r.statut] ?? 'bg-gray-100'}`}>{r.statut.replace(/_/g, ' ')}</span>
              </div>
              {r.statut === 'EN_ATTENTE_DG' && (
                <div className="mt-3 space-y-2">
                  <input type="text" placeholder="Commentaire / décision (optionnel)" value={decision} onChange={e => setDecision(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => handleRetour(r.id, 'valide')} disabled={saving === r.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"><CheckCircle size={12} /> Valider le remplacement</button>
                    <button onClick={() => handleRetour(r.id, 'rejete')} disabled={saving === r.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50"><XCircle size={12} /> Rejeter</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {tab === 'decons' && (decons.length === 0 ? <p className="text-gray-400 text-sm text-center py-12">Aucune déconsignation.</p> : (
        <div className="space-y-3">
          {decons.map(d => (
            <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-mono text-xs text-purple-600">{d.numero}</p>
                  <p className="font-medium text-gray-800">{d.quantite}× {d.type_bouteille} — {Number(d.montant_rachat).toLocaleString('fr-FR')} F</p>
                  <p className="text-xs text-gray-400">{d.clients?.nom_interne} · {d.agences?.nom} · Par {d.profiles?.prenom} {d.profiles?.nom}</p>
                  {d.notes && <p className="text-xs text-gray-500 mt-1">{d.notes}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUT_STYLE[d.statut] ?? 'bg-gray-100'}`}>{d.statut.replace(/_/g, ' ')}</span>
              </div>
              {d.statut === 'EN_ATTENTE_DG' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleDecon(d.id, 'valide')} disabled={saving === d.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"><CheckCircle size={12} /> Valider</button>
                  <button onClick={() => handleDecon(d.id, 'rejete')} disabled={saving === d.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50"><XCircle size={12} /> Rejeter</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </Layout>
  )
}
