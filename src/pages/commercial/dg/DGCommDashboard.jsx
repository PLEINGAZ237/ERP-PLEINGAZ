import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import DGCommLayout from '@/components/commercial/DGCommLayout'
import { Loader2, TrendingUp, AlertTriangle, Wallet, Package, CheckCircle, XCircle } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function DGCommDashboard() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [factures, setFactures] = useState([])
  const [caisses, setCaisses] = useState([])
  const [stocks, setStocks] = useState([])
  const [stats, setStats] = useState({ ca: 0, regle: 0, dettes: 0, ecarts_caisse: 0, ecarts_stock: 0 })
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async () => {
    setLoading(true)
    const [{ data: fac }, { data: jc }, { data: js }] = await Promise.all([
      supabase.from('factures').select('*, commandes(numero, clients(nom_interne, categories_clients(nom))), profiles!facture_par(nom, prenom)').eq('statut', 'EN_ATTENTE_DG').order('created_at', { ascending: false }),
      supabase.from('journees_caisse').select('*, caisses(nom)').order('date_journee', { ascending: false }).limit(20),
      supabase.from('journees_stock').select('*, magasins(nom), lignes_journee_stock(stock_ouverture, total_entrees, total_sorties, stock_physique)').order('date_journee', { ascending: false }).limit(20),
    ])
    setFactures(fac ?? [])
    setCaisses(jc ?? [])
    setStocks(js ?? [])
    const allFac = await supabase.from('factures').select('montant_total, montant_regle, statut')
    const facList = allFac.data ?? []
    const ca = facList.reduce((s, f) => s + (parseFloat(f.montant_total) || 0), 0)
    const regle = facList.reduce((s, f) => s + (parseFloat(f.montant_regle) || 0), 0)
    const dettesTotal = facList
      .filter(f => ['EN_ATTENTE_DG', 'DETTE_VALIDEE'].includes(f.statut))
      .reduce((s, f) => s + ((parseFloat(f.montant_total) || 0) - (parseFloat(f.montant_regle) || 0)), 0)
    const ecCaisse = (jc ?? []).filter(j => j.statut === 'CLOTUREE' && j.ecart !== 0 && j.ecart !== null).length
    const ecStock = (js ?? []).filter(j => {
      return j.statut === 'CLOTUREE' && (j.lignes_journee_stock ?? []).some(l => {
        const theo = l.stock_ouverture + l.total_entrees - l.total_sorties
        return l.stock_physique !== null && l.stock_physique !== theo
      })
    }).length
    setStats({ ca, regle, dettes: dettesTotal, ecarts_caisse: ecCaisse, ecarts_stock: ecStock })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAction = async (factureId, action) => {
    setError(''); setSuccess(''); setSaving(factureId)
    const { data, error: err } = await supabase.rpc('valider_dette_dg', { p_facture_id: factureId, p_action: action })
    setSaving(null)
    if (err) { setError(err.message); return }
    setSuccess(action === 'valide' ? 'Dette validée — bon de livraison généré.' : 'Facture annulée.')
    load()
  }

  if (loading) return <DGCommLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-orange-500" size={28} /></div></DGCommLayout>

  return (
    <DGCommLayout>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Tableau de bord DG</h1>
        <p className="text-sm text-gray-400">Vue globale — ventes, dettes, caisses et stocks.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'CA total', value: fmt(stats.ca), color: 'text-blue-600', icon: TrendingUp },
          { label: 'Réglé', value: fmt(stats.regle), color: 'text-green-600', icon: Wallet },
          { label: 'Dettes', value: fmt(stats.dettes), color: 'text-red-600', icon: AlertTriangle },
          { label: 'Écarts caisse', value: stats.ecarts_caisse, color: 'text-amber-600', icon: Wallet },
          { label: 'Écarts stock', value: stats.ecarts_stock, color: 'text-green-600', icon: Package },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1"><s.icon size={14} className={s.color} /><p className={`text-[10px] font-bold uppercase ${s.color}`}>{s.label}</p></div>
            <p className="text-lg font-bold text-gray-800">{s.value}</p>
          </div>
        ))}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl mb-4">{success}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b"><h2 className="font-semibold text-gray-700 text-sm">Dettes en attente ({factures.length})</h2></div>
        {factures.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Aucune dette en attente.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {factures.map(f => (
              <div key={f.id} className="px-5 py-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-mono text-xs text-orange-600">{f.numero}</p>
                    <p className="font-medium text-gray-800 text-sm">{f.commandes?.clients?.nom_interne}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">Dette: {fmt(f.montant_total - f.montant_regle)}</p>
                    <p className="text-xs text-gray-400">Total: {fmt(f.montant_total)} · Réglé: {fmt(f.montant_regle)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAction(f.id, 'valide')} disabled={saving === f.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50">
                    <CheckCircle size={12} /> Valider
                  </button>
                  <button onClick={() => handleAction(f.id, 'rejete')} disabled={saving === f.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50">
                    <XCircle size={12} /> Rejeter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <h2 className="font-semibold text-gray-700 text-sm">Journées caisse</h2>
            <Link to="/commercial/dg/rapports-caisse" className="text-xs text-blue-600 hover:underline">Voir tout →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {caisses.slice(0, 5).map(jc => (
              <div key={jc.id} className="px-5 py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-700">{jc.caisses?.nom}</p>
                  <p className="text-xs text-gray-400">{new Date(jc.date_journee).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${jc.statut === 'CLOTUREE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {jc.statut === 'CLOTUREE' ? 'Clôturée' : 'Ouverte'}
                  </span>
                  {jc.ecart !== 0 && jc.ecart !== null && <p className={`text-xs font-bold mt-1 ${jc.ecart > 0 ? 'text-green-600' : 'text-red-600'}`}>Écart: {fmt(jc.ecart)}</p>}
                </div>
              </div>
            ))}
            {caisses.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Aucune donnée.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <h2 className="font-semibold text-gray-700 text-sm">Journées stock</h2>
            <Link to="/commercial/dg/rapports-stock" className="text-xs text-blue-600 hover:underline">Voir tout →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stocks.slice(0, 5).map(js => {
              const ecarts = (js.lignes_journee_stock ?? []).filter(l => {
                const theo = l.stock_ouverture + l.total_entrees - l.total_sorties
                return l.stock_physique !== null && l.stock_physique !== theo
              }).length
              return (
                <div key={js.id} className="px-5 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{js.magasins?.nom}</p>
                    <p className="text-xs text-gray-400">{new Date(js.date_journee).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${js.statut === 'CLOTUREE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {js.statut === 'CLOTUREE' ? 'Clôturée' : 'Ouverte'}
                    </span>
                    {ecarts > 0 && <p className="text-xs font-bold text-red-600 mt-1">{ecarts} écart{ecarts > 1 ? 's' : ''}</p>}
                  </div>
                </div>
              )
            })}
            {stocks.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Aucune donnée.</p>}
          </div>
        </div>
      </div>
    </DGCommLayout>
  )
}
