import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import RespAgenceLayout from '@/components/commercial/RespAgenceLayout'
import { Loader2, CheckCircle, XCircle, Wallet, Package } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function ValidationsClotures() {
  const [caissesAttente, setCaissesAttente] = useState([])
  const [stocksAttente, setStocksAttente] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async () => {
    setLoading(true)
    const [{ data: jc }, { data: js }] = await Promise.all([
      supabase.from('journees_caisse').select('*, caisses(nom), profiles!cloturee_par(nom, prenom)')
        .eq('statut', 'CLOTUREE').order('date_journee', { ascending: false }),
      supabase.from('journees_stock').select('*, magasins(nom), profiles!cloturee_par(nom, prenom)')
        .eq('statut', 'CLOTUREE').order('date_journee', { ascending: false }),
    ])
    setCaissesAttente(jc ?? [])
    setStocksAttente(js ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const validerCaisse = async (id) => {
    setSaving(id); setError('')
    const { error: err } = await supabase.rpc('valider_cloture_caisse', { p_journee_caisse_id: id })
    setSaving(null)
    if (err) { setError(err.message); return }
    setSuccess('Clôture caisse validée.')
    load()
  }

  const validerStock = async (id) => {
    setSaving(id); setError('')
    const { error: err } = await supabase.rpc('valider_cloture_stock', { p_journee_stock_id: id })
    setSaving(null)
    if (err) { setError(err.message); return }
    setSuccess('Clôture stock validée.')
    load()
  }

  if (loading) return <RespAgenceLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></RespAgenceLayout>

  return (
    <RespAgenceLayout>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Validations</h1>
      <p className="text-sm text-gray-400 mb-6">Validez les clôtures de caisse et de stock de votre agence.</p>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center gap-2">
            <Wallet size={16} className="text-amber-500" />
            <h2 className="font-semibold text-gray-700 text-sm">Clôtures caisse en attente ({caissesAttente.length})</h2>
          </div>
          {caissesAttente.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aucune clôture en attente.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {caissesAttente.map(jc => (
                <div key={jc.id} className="px-5 py-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{jc.caisses?.nom}</p>
                      <p className="text-xs text-gray-400">{new Date(jc.date_journee).toLocaleDateString('fr-FR')} · Par {jc.profiles?.prenom} {jc.profiles?.nom}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Solde : {fmt(jc.solde_cloture)}</p>
                      {jc.ecart !== 0 && <p className="text-xs font-bold text-red-600">Écart : {fmt(jc.ecart)}</p>}
                    </div>
                  </div>
                  <button onClick={() => validerCaisse(jc.id)} disabled={saving === jc.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50">
                    <CheckCircle size={12} /> {saving === jc.id ? 'Validation...' : 'Valider la clôture'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center gap-2">
            <Package size={16} className="text-green-500" />
            <h2 className="font-semibold text-gray-700 text-sm">Clôtures stock en attente ({stocksAttente.length})</h2>
          </div>
          {stocksAttente.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aucune clôture en attente.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {stocksAttente.map(js => (
                <div key={js.id} className="px-5 py-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{js.magasins?.nom}</p>
                      <p className="text-xs text-gray-400">{new Date(js.date_journee).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <button onClick={() => validerStock(js.id)} disabled={saving === js.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50">
                    <CheckCircle size={12} /> {saving === js.id ? 'Validation...' : 'Valider la clôture'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RespAgenceLayout>
  )
}
