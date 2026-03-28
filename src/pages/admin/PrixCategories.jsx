import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/admin/AdminLayout'
import { Loader2, Save, CheckCircle } from 'lucide-react'

const CATEGORIE_LABELS = { GPL: 'GPL', CONSIGNE: 'Consigne', ACCESSOIRE: 'Accessoire' }

export default function PrixCategories() {
  const [categories, setCategories] = useState([])
  const [articles, setArticles]     = useState([])
  const [prix, setPrix]             = useState({})
  const [prixCentre, setPrixCentre] = useState({})
  const [selectedCat, setSelectedCat] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [success, setSuccess]       = useState('')
  const [error, setError]           = useState('')
  const [onglet, setOnglet]         = useState('categories')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: cats }, { data: arts }, { data: pxData }, { data: pxCentre }] = await Promise.all([
        supabase.from('categories_clients').select('*').eq('statut', 'actif').order('nom'),
        supabase.from('articles').select('*').eq('statut', 'actif').order('categorie, nom'),
        supabase.from('prix_categories').select('*'),
        supabase.from('prix_centre_enfuteur').select('*'),
      ])
      setCategories(cats ?? [])
      setArticles(arts ?? [])
      if (cats?.length > 0) setSelectedCat(cats[0].id)

      const map = {}
      ;(pxData ?? []).forEach(p => {
        map[`${p.categorie_client_id}_${p.article_id}`] = p.prix
      })
      setPrix(map)

      const centreMap = {}
      ;(pxCentre ?? []).forEach(p => { centreMap[p.article_id] = p.prix })
      setPrixCentre(centreMap)

      setLoading(false)
    }
    load()
  }, [])

  const handlePrixChange = (catId, artId, value) => {
    setPrix(prev => ({ ...prev, [`${catId}_${artId}`]: value }))
  }

  const handleCentreChange = (artId, value) => {
    setPrixCentre(prev => ({ ...prev, [artId]: value }))
  }

  const savePrixCategorie = async () => {
    setSaving(true); setError(''); setSuccess('')

    const rows = articles.map(art => {
      const val = prix[`${selectedCat}_${art.id}`]
      return val !== undefined && val !== ''
        ? { categorie_client_id: selectedCat, article_id: art.id, prix: Number(val) }
        : null
    }).filter(Boolean)

    for (const row of rows) {
      const { error: err } = await supabase
        .from('prix_categories')
        .upsert(row, { onConflict: 'categorie_client_id,article_id' })
      if (err) { setError(err.message); setSaving(false); return }
    }

    setSaving(false)
    setSuccess('Prix enregistrés.')
    setTimeout(() => setSuccess(''), 3000)
  }

  const savePrixCentre = async () => {
    setSaving(true); setError(''); setSuccess('')

    const gplArticles = articles.filter(a => a.categorie === 'GPL')
    for (const art of gplArticles) {
      const val = prixCentre[art.id]
      if (val === undefined || val === '') continue
      const { error: err } = await supabase
        .from('prix_centre_enfuteur')
        .upsert({ article_id: art.id, prix: Number(val) }, { onConflict: 'article_id' })
      if (err) { setError(err.message); setSaving(false); return }
    }

    setSaving(false)
    setSuccess('Prix centre enfûteur enregistrés.')
    setTimeout(() => setSuccess(''), 3000)
  }

  const catNom = categories.find(c => c.id === selectedCat)?.nom ?? ''
  const grouped = {}
  articles.forEach(a => {
    if (!grouped[a.categorie]) grouped[a.categorie] = []
    grouped[a.categorie].push(a)
  })

  if (loading) return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Loader2 className="animate-spin mb-2" /><p>Chargement...</p>
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout>
      <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Grille de prix</h2>
      <p className="text-sm text-gray-400 mb-6">Définir le prix de chaque article par catégorie de client et pour les centres enfûteurs.</p>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'categories', label: 'Par catégorie' },
          { key: 'centre', label: 'Centre enfûteur' },
        ].map(t => (
          <button key={t.key} onClick={() => setOnglet(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              onglet === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>{t.label}</button>
        ))}
      </div>

      {onglet === 'categories' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCat === cat.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
                }`}>{cat.nom}</button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-700 text-sm">Prix pour : <span className="text-blue-600">{catNom}</span></h3>
            </div>
            <div className="divide-y divide-gray-50">
              {Object.entries(grouped).map(([cat, arts]) => (
                <div key={cat}>
                  <div className="px-5 py-2 bg-gray-50/50">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{CATEGORIE_LABELS[cat] ?? cat}</span>
                  </div>
                  {arts.map(art => {
                    const key = `${selectedCat}_${art.id}`
                    return (
                      <div key={art.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50">
                        <span className="text-sm text-gray-700 font-medium">{art.nom}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="0" placeholder="0"
                            value={prix[key] ?? ''}
                            onChange={e => handlePrixChange(selectedCat, art.id, e.target.value)}
                            className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          />
                          <span className="text-xs text-gray-400 w-12">FCFA</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t bg-gray-50 flex items-center justify-between">
              {error && <p className="text-red-600 text-xs">{error}</p>}
              {success && <p className="text-green-600 text-xs flex items-center gap-1"><CheckCircle size={14} />{success}</p>}
              {!error && !success && <span />}
              <button onClick={savePrixCategorie} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {onglet === 'centre' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-700 text-sm">Prix centre enfûteur <span className="text-gray-400 font-normal">(MAGZI, DIBAMBA)</span></h3>
          </div>
          <div className="divide-y divide-gray-50">
            {articles.filter(a => a.categorie === 'GPL').map(art => (
              <div key={art.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50">
                <span className="text-sm text-gray-700 font-medium">{art.nom}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" placeholder="0"
                    value={prixCentre[art.id] ?? ''}
                    onChange={e => handleCentreChange(art.id, e.target.value)}
                    className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                  />
                  <span className="text-xs text-gray-400 w-12">FCFA</span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t bg-gray-50 flex items-center justify-between">
            {error && <p className="text-red-600 text-xs">{error}</p>}
            {success && <p className="text-green-600 text-xs flex items-center gap-1"><CheckCircle size={14} />{success}</p>}
            {!error && !success && <span />}
            <button onClick={savePrixCentre} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
