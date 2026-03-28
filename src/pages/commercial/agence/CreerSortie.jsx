import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import RespAgenceLayout from '@/components/commercial/RespAgenceLayout'
import { ArrowLeft, Loader2, Truck } from 'lucide-react'

const fmt = (n) => Number(n).toLocaleString('fr-FR')

export default function CreerSortie() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [vehicules, setVehicules] = useState([])
  const [vendeurs, setVendeurs] = useState([])
  const [itineraires, setItineraires] = useState([])
  const [magasins, setMagasins] = useState([])
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    vehicule_id: '', vendeur_id: '', itineraire_id: '', magasin_source_id: '', hors_ville: false,
  })
  const [lignes, setLignes] = useState([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: v }, { data: p }, { data: it }, { data: m }, { data: a }] = await Promise.all([
        supabase.from('vehicules').select('id, nom, immatriculation').eq('statut', 'actif').order('immatriculation'),
        supabase.from('profiles').select('id, nom, prenom, email').order('nom'),
        supabase.from('itineraires').select('id, nom, zone, ville').eq('statut', 'actif').order('nom'),
        supabase.from('magasins').select('id, nom').eq('statut', 'actif').order('nom'),
        supabase.from('articles').select('id, nom, categorie').eq('statut', 'actif').order('categorie, nom'),
      ])
      setVehicules(v ?? [])
      setVendeurs(p ?? [])
      setItineraires(it ?? [])
      setMagasins(m ?? [])
      setArticles(a ?? [])
      setLignes((a ?? []).map(art => ({ article_id: art.id, nom: art.nom, categorie: art.categorie, quantite: 0 })))
      setLoading(false)
    }
    load()
  }, [])

  const updateQty = (artId, qty) => setLignes(prev => prev.map(l => l.article_id === artId ? { ...l, quantite: Math.max(0, parseInt(qty) || 0) } : l))
  const lignesActives = lignes.filter(l => l.quantite > 0)

  const handleSubmit = async () => {
    setError('')
    if (!form.vehicule_id) { setError('Sélectionnez un véhicule.'); return }
    if (!form.vendeur_id) { setError('Sélectionnez un vendeur.'); return }
    if (!form.magasin_source_id) { setError('Sélectionnez un magasin source.'); return }
    if (lignesActives.length === 0) { setError('Ajoutez au moins un article.'); return }

    setSaving(true)

    const { data, error: errSv } = await supabase.rpc('creer_sortie_vehicule', {
      p_vehicule_id: form.vehicule_id,
      p_vendeur_id: form.vendeur_id,
      p_itineraire_id: form.itineraire_id || null,
      p_magasin_source_id: form.magasin_source_id,
      p_hors_ville: form.hors_ville,
      p_lignes: lignesActives.map(l => ({ article_id: l.article_id, quantite: l.quantite })),
    })

    if (errSv) { setSaving(false); setError(errSv.message); return }

    setSaving(false)
    setSuccess(`Sortie ${data.numero} créée !`)
    setTimeout(() => navigate('/commercial/agence/sorties'), 2000)
  }

  const grouped = {}
  lignes.forEach(l => { if (!grouped[l.categorie]) grouped[l.categorie] = []; grouped[l.categorie].push(l) })

  if (loading) return <RespAgenceLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-teal-500" size={28} /></div></RespAgenceLayout>

  return (
    <RespAgenceLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/commercial/agence/sorties')} className="text-teal-600 hover:underline text-sm flex items-center gap-1"><ArrowLeft size={16} /> Retour</button>
          <h1 className="text-xl font-bold text-gray-800">Nouvelle sortie véhicule</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-4">Informations de la sortie</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Véhicule *</label>
              <select value={form.vehicule_id} onChange={e => setForm({ ...form, vehicule_id: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/20">
                <option value="">Sélectionner...</option>
                {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation} {v.nom ? `— ${v.nom}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Vendeur / Commercial *</label>
              <select value={form.vendeur_id} onChange={e => setForm({ ...form, vendeur_id: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/20">
                <option value="">Sélectionner...</option>
                {vendeurs.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Itinéraire</label>
              <select value={form.itineraire_id} onChange={e => setForm({ ...form, itineraire_id: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/20">
                <option value="">Sélectionner...</option>
                {itineraires.map(i => <option key={i.id} value={i.id}>{i.nom} {i.zone ? `(${i.zone})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Magasin source *</label>
              <select value={form.magasin_source_id} onChange={e => setForm({ ...form, magasin_source_id: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/20">
                <option value="">Sélectionner...</option>
                {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input type="checkbox" checked={form.hors_ville} onChange={e => setForm({ ...form, hors_ville: e.target.checked })} className="w-4 h-4 accent-teal-600" />
            <span className="text-sm text-gray-600">Sortie hors ville (bordereau de route)</span>
          </label>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-4">Stock à charger</h2>
          {Object.entries(grouped).map(([cat, arts]) => (
            <div key={cat} className="mb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{cat}</p>
              <div className="space-y-2">
                {arts.map(l => (
                  <div key={l.article_id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
                    <span className="flex-1 text-sm font-medium text-gray-700">{l.nom}</span>
                    <input type="number" min="0" value={l.quantite || ''} onChange={e => updateQty(l.article_id, e.target.value)}
                      placeholder="0" className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center outline-none focus:ring-2 focus:ring-teal-500/20" />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="border-t pt-3 mt-2">
            <p className="text-sm text-gray-500">{lignesActives.length} article{lignesActives.length > 1 ? 's' : ''} à charger — {lignesActives.reduce((s, l) => s + l.quantite, 0)} unités</p>
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
        {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

        <button onClick={handleSubmit} disabled={saving}
          className="w-full py-3 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2">
          <Truck size={16} /> {saving ? 'Création...' : 'Créer la sortie véhicule'}
        </button>
      </div>
    </RespAgenceLayout>
  )
}
