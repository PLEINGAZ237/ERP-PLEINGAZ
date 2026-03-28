import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import RespAgenceLayout from '@/components/commercial/RespAgenceLayout'
import { Loader2, Plus, Package } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'
const STATUT_STYLE = { EN_ATTENTE_DG: 'bg-amber-100 text-amber-700', VALIDE: 'bg-green-100 text-green-700', REJETE: 'bg-red-100 text-red-700', REMPLACEMENT_EFFECTUE: 'bg-blue-100 text-blue-700' }

export default function RetoursProduits() {
  const { user } = useAuth()
  const [retours, setRetours] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreer, setShowCreer] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [agences, setAgences] = useState([])
  const [magasins, setMagasins] = useState([])
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({ type_retour: 'GPL', agence_id: '', magasin_id: '', client_id: '', type_bouteille: '12.5KG', poids: '', numero_facture: '', date_achat: '', motif: '', constat: '', quantite: 1 })

  const load = async () => {
    setLoading(true)
    const [{ data: ret }, { data: ag }, { data: mg }, { data: cl }] = await Promise.all([
      supabase.from('retours_produits').select('*, agences(nom), magasins(nom), clients(nom_interne), profiles!initie_par(nom, prenom)').order('created_at', { ascending: false }),
      supabase.from('agences').select('id, nom').eq('statut', 'actif').order('nom'),
      supabase.from('magasins').select('id, nom').eq('statut', 'actif').order('nom'),
      supabase.from('clients').select('id, nom_interne').eq('statut', 'actif').order('nom_interne'),
    ])
    setRetours(ret ?? []); setAgences(ag ?? []); setMagasins(mg ?? []); setClients(cl ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreer = async () => {
    if (!form.agence_id || !form.magasin_id || !form.motif) { setError('Remplissez les champs obligatoires.'); return }
    setError(''); setSaving(true)
    const { data, error: err } = await supabase.rpc('initier_retour_produit', {
      p_type_retour: form.type_retour, p_agence_id: form.agence_id, p_magasin_id: form.magasin_id,
      p_client_id: form.client_id || null, p_type_bouteille: form.type_retour === 'GPL' ? form.type_bouteille : null,
      p_poids: form.poids ? Number(form.poids) : null, p_numero_facture: form.numero_facture || null,
      p_date_achat: form.date_achat || null, p_motif: form.motif, p_constat: form.constat || null,
      p_quantite: Number(form.quantite) || 1,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(`Retour ${data.numero} envoyé au DG.`); setShowCreer(false); load()
  }

  if (loading) return <RespAgenceLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></RespAgenceLayout>

  return (
    <RespAgenceLayout>
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-xl font-bold text-gray-800">Retours produits</h1><p className="text-sm text-gray-400">Initier un retour GPL ou accessoire.</p></div>
        <button onClick={() => setShowCreer(true)} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-teal-700"><Plus size={16} /> Nouveau retour</button>
      </div>
      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

      {retours.length === 0 ? <p className="text-gray-400 text-sm text-center py-12">Aucun retour.</p> : (
        <div className="space-y-3">
          {retours.map(r => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono text-xs text-teal-600">{r.numero}</p>
                  <p className="font-medium text-gray-800">{r.type_retour} {r.type_bouteille ? `(${r.type_bouteille})` : ''} × {r.quantite}</p>
                  <p className="text-xs text-gray-400">{r.clients?.nom_interne ?? '—'} · {r.agences?.nom} · {r.magasins?.nom}</p>
                  <p className="text-xs text-gray-500 mt-1">Motif : {r.motif_retour}</p>
                  {r.decision_dg && <p className="text-xs text-gray-500">DG : {r.decision_dg}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUT_STYLE[r.statut] ?? 'bg-gray-100 text-gray-600'}`}>{r.statut.replace(/_/g, ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Nouveau retour produit</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Type *</label>
                  <select value={form.type_retour} onChange={e => setForm({ ...form, type_retour: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                    <option value="GPL">GPL</option><option value="ACCESSOIRE">Accessoire</option>
                  </select></div>
                {form.type_retour === 'GPL' && <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Bouteille</label>
                  <select value={form.type_bouteille} onChange={e => setForm({ ...form, type_bouteille: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                    <option value="50KG">50KG</option><option value="12.5KG">12.5KG</option><option value="6KG">6KG</option>
                  </select></div>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Agence *</label>
                  <select value={form.agence_id} onChange={e => setForm({ ...form, agence_id: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                    <option value="">Sélectionner</option>{agences.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                  </select></div>
                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Magasin *</label>
                  <select value={form.magasin_id} onChange={e => setForm({ ...form, magasin_id: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                    <option value="">Sélectionner</option>{magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                  </select></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Client</label>
                <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                  <option value="">Aucun</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nom_interne}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">N° facture achat</label>
                  <input type="text" value={form.numero_facture} onChange={e => setForm({ ...form, numero_facture: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
                <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Quantité</label>
                  <input type="number" min="1" value={form.quantite} onChange={e => setForm({ ...form, quantite: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              </div>
              {form.type_retour === 'GPL' && <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Poids constaté (kg)</label>
                <input type="number" step="0.01" value={form.poids} onChange={e => setForm({ ...form, poids: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>}
              <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Motif du retour *</label>
                <textarea rows={2} value={form.motif} onChange={e => setForm({ ...form, motif: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Constat après examen</label>
                <textarea rows={2} value={form.constat} onChange={e => setForm({ ...form, constat: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowCreer(false)} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Annuler</button>
              <button onClick={handleCreer} disabled={saving} className="flex-1 py-2.5 text-sm bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50">{saving ? 'Envoi...' : 'Envoyer au DG'}</button>
            </div>
          </div>
        </div>
      )}
    </RespAgenceLayout>
  )
}
