import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DGCommLayout from '@/components/commercial/DGCommLayout'
import { Loader2, Plus, CheckCircle, XCircle } from 'lucide-react'

export default function OrdresPublicite({ Layout = DGCommLayout, canCreate = true, canValidate = false }) {
  const [ordres, setOrdres] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreer, setShowCreer] = useState(false)
  const [magasins, setMagasins] = useState([])
  const [articles, setArticles] = useState([])
  const [form, setForm] = useState({ magasin_id: '', motif: '', beneficiaire: '', lignes: [{ article_id: '', quantite: '' }] })

  const load = async () => {
    setLoading(true)
    const [{ data: o }, { data: mg }, { data: art }] = await Promise.all([
      supabase.from('ordres_publicite').select('*, magasins(nom), profiles!initie_par(nom, prenom), lignes_ordre_publicite(*, articles(nom))').order('created_at', { ascending: false }),
      supabase.from('magasins').select('id, nom').eq('statut', 'actif').order('nom'),
      supabase.from('articles').select('id, nom, categorie').eq('statut', 'actif').order('nom'),
    ])
    setOrdres(o ?? []); setMagasins(mg ?? []); setArticles(art ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const addLigne = () => setForm({ ...form, lignes: [...form.lignes, { article_id: '', quantite: '' }] })
  const updateLigne = (i, k, v) => setForm({ ...form, lignes: form.lignes.map((l, j) => j === i ? { ...l, [k]: v } : l) })

  const handleCreer = async () => {
    if (!form.magasin_id || !form.motif) { setError('Champs obligatoires.'); return }
    const la = form.lignes.filter(l => l.article_id && Number(l.quantite) > 0)
    if (!la.length) { setError('Ajoutez un article.'); return }
    setError(''); setSaving('creer')
    const { data, error: err } = await supabase.rpc('creer_ordre_publicite', {
      p_magasin_id: form.magasin_id, p_motif: form.motif, p_beneficiaire: form.beneficiaire || null,
      p_lignes: la.map(l => ({ article_id: l.article_id, quantite: Number(l.quantite) })),
    })
    setSaving(null)
    if (err) { setError(err.message); return }
    setSuccess(`Ordre ${data.numero} créé.`); setShowCreer(false); load()
  }

  const handleValider = async (id, action) => {
    setSaving(id)
    const { error: err } = await supabase.rpc('valider_ordre_publicite', { p_ordre_id: id, p_action: action })
    setSaving(null)
    if (err) { setError(err.message); return }
    setSuccess(action === 'valide' ? 'Ordre validé.' : 'Ordre rejeté.'); load()
  }

  if (loading) return <Layout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></Layout>
  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-xl font-bold text-gray-800">Ordres de publicité</h1></div>
        {canCreate && <button onClick={() => setShowCreer(true)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700"><Plus size={16} /> Nouvel ordre</button>}
      </div>
      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}
      {ordres.length === 0 ? <p className="text-gray-400 text-sm text-center py-12">Aucun ordre.</p> : (
        <div className="space-y-3">{ordres.map(o => (
          <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-mono text-xs text-purple-600">{o.numero}</p>
                <p className="font-medium text-gray-800">{o.motif}</p>
                <p className="text-xs text-gray-400">Bénéficiaire: {o.beneficiaire ?? '—'} · {o.magasins?.nom}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100">{o.statut?.replace(/_/g, ' ')}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 mb-2">{(o.lignes_ordre_publicite ?? []).map(l => (
              <div key={l.id} className="flex justify-between text-xs py-0.5"><span>{l.articles?.nom}</span><span className="font-bold">× {l.quantite}</span></div>
            ))}</div>
            {canValidate && o.statut === 'EN_ATTENTE_AUDIT' && (
              <div className="flex gap-2">
                <button onClick={() => handleValider(o.id, 'valide')} disabled={saving === o.id} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold"><CheckCircle size={12} /> Valider</button>
                <button onClick={() => handleValider(o.id, 'rejete')} disabled={saving === o.id} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold"><XCircle size={12} /> Rejeter</button>
              </div>
            )}
          </div>
        ))}</div>
      )}
      {showCreer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Nouvel ordre de publicité</h3>
            <div className="space-y-3">
              <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Magasin *</label><select value={form.magasin_id} onChange={e => setForm({ ...form, magasin_id: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"><option value="">Sélectionner</option>{magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}</select></div>
              <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Motif *</label><input value={form.motif} onChange={e => setForm({ ...form, motif: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Bénéficiaire</label><input value={form.beneficiaire} onChange={e => setForm({ ...form, beneficiaire: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">Articles *</label>
                {form.lignes.map((l, i) => (<div key={i} className="flex gap-2 mb-2"><select value={l.article_id} onChange={e => updateLigne(i, 'article_id', e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none"><option value="">Article</option>{articles.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select><input type="number" min="1" value={l.quantite} onChange={e => updateLigne(i, 'quantite', e.target.value)} placeholder="Qté" className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center outline-none" /></div>))}
                <button onClick={addLigne} className="text-xs text-blue-600 font-medium">+ Article</button>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowCreer(false)} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Annuler</button>
              <button onClick={handleCreer} disabled={saving === 'creer'} className="flex-1 py-2.5 text-sm bg-purple-600 text-white rounded-xl font-bold">{saving === 'creer' ? 'Création...' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
