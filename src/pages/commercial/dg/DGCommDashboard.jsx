import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import DGCommLayout from '@/components/commercial/DGCommLayout'
import { Loader2, TrendingUp, AlertTriangle, Wallet, Package, ArrowUpRight, ArrowDownRight, Flame } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function DGCommDashboard() {
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
    const { error: err } = await supabase.rpc('valider_dette_dg', { p_facture_id: factureId, p_action: action })
    setSaving(null)
    if (err) { setError(err.message); return }
    setSuccess(action === 'valide' ? 'Dette validée — bon de livraison généré.' : 'Facture annulée.')
    load()
  }

  if (loading) return <DGCommLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-orange-500" size={28} /></div></DGCommLayout>

  const STAT_CARDS = [
    { label: 'Chiffre d\'affaires', value: fmt(stats.ca), icon: TrendingUp, color: 'from-blue-500 to-blue-600', light: 'bg-blue-50 text-blue-600', trend: stats.ca > 0 ? '+' : '' },
    { label: 'Réglé', value: fmt(stats.regle), icon: Wallet, color: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50 text-emerald-600' },
    { label: 'Dettes', value: fmt(stats.dettes), icon: AlertTriangle, color: 'from-red-500 to-red-600', light: 'bg-red-50 text-red-600', alert: stats.dettes > 0 },
    { label: 'Écarts caisse', value: stats.ecarts_caisse.toString(), icon: Wallet, color: 'from-amber-500 to-amber-600', light: 'bg-amber-50 text-amber-600', alert: stats.ecarts_caisse > 0 },
    { label: 'Écarts stock', value: stats.ecarts_stock.toString(), icon: Package, color: 'from-purple-500 to-purple-600', light: 'bg-purple-50 text-purple-600', alert: stats.ecarts_stock > 0 },
  ]

  return (
    <DGCommLayout>
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Flame size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tableau de bord</h1>
            <p className="text-sm text-gray-400">Vue globale — ventes, dettes, caisses et stocks.</p>
          </div>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4 border border-red-100 animate-slide-up">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl mb-4 border border-emerald-100 animate-slide-up">{success}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {STAT_CARDS.map((s, i) => (
          <div key={i} className="relative bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-hidden card-hover animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}>
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.color}`} />
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-xl ${s.light} flex items-center justify-center`}>
                <s.icon size={15} />
              </div>
              {s.alert && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
            </div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.alert ? 'text-red-600' : 'text-gray-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Dettes en attente */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-500" />
              <h2 className="font-semibold text-gray-800 text-sm">Dettes en attente</h2>
              {factures.length > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{factures.length}</span>}
            </div>
            <Link to="/commercial/dg/dettes" className="text-[11px] font-medium text-orange-600 hover:underline flex items-center gap-1">
              Voir tout <ArrowUpRight size={11} />
            </Link>
          </div>
          {factures.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <TrendingUp size={20} className="text-emerald-500" />
              </div>
              <p className="text-gray-400 text-sm">Aucune dette en attente</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {factures.slice(0, 5).map(f => (
                <div key={f.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-mono text-orange-500 mb-0.5">{f.numero}</p>
                      <p className="font-semibold text-gray-800 text-sm">{f.commandes?.clients?.nom_interne}</p>
                      <p className="text-[11px] text-gray-400">{f.commandes?.clients?.categories_clients?.nom} · Par {f.profiles?.prenom} {f.profiles?.nom}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-red-600">{fmt(f.montant_total - f.montant_regle)}</p>
                      <p className="text-[10px] text-gray-400">sur {fmt(f.montant_total)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(f.id, 'valide')} disabled={saving === f.id}
                      className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[11px] font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-sm shadow-emerald-500/20">
                      ✓ Valider — livrer
                    </button>
                    <button onClick={() => handleAction(f.id, 'rejete')} disabled={saving === f.id}
                      className="px-3 py-1.5 bg-white text-red-500 rounded-lg text-[11px] font-semibold hover:bg-red-50 transition-colors border border-red-200 disabled:opacity-50">
                      ✕ Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Journées caisse */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={14} className="text-amber-500" />
                <h2 className="font-semibold text-gray-700 text-[13px]">Journées caisse</h2>
              </div>
              <Link to="/commercial/dg/rapports-caisse" className="text-[11px] text-orange-500 hover:underline flex items-center gap-1">Voir tout <ArrowUpRight size={10} /></Link>
            </div>
            <div className="divide-y divide-gray-50">
              {caisses.slice(0, 4).map(jc => (
                <div key={jc.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{jc.caisses?.nom}</p>
                    <p className="text-[10px] text-gray-400">{new Date(jc.date_journee).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                    jc.statut === 'OUVERTE' ? 'bg-emerald-50 text-emerald-600' :
                    jc.statut === 'CLOTUREE' ? 'bg-amber-50 text-amber-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>{jc.statut === 'OUVERTE' ? 'Ouverte' : jc.statut === 'VALIDEE' ? 'Validée' : 'Clôturée'}</span>
                </div>
              ))}
              {caisses.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Aucune journée.</p>}
            </div>
          </div>

          {/* Journées stock */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in" style={{ animationDelay: '500ms' }}>
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={14} className="text-green-500" />
                <h2 className="font-semibold text-gray-700 text-[13px]">Journées stock</h2>
              </div>
              <Link to="/commercial/dg/rapports-stock" className="text-[11px] text-orange-500 hover:underline flex items-center gap-1">Voir tout <ArrowUpRight size={10} /></Link>
            </div>
            <div className="divide-y divide-gray-50">
              {stocks.slice(0, 4).map(js => {
                const ecarts = (js.lignes_journee_stock ?? []).filter(l => {
                  const theo = l.stock_ouverture + l.total_entrees - l.total_sorties
                  return l.stock_physique !== null && l.stock_physique !== theo
                }).length
                return (
                  <div key={js.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{js.magasins?.nom}</p>
                      <p className="text-[10px] text-gray-400">{new Date(js.date_journee).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                        js.statut === 'OUVERTE' ? 'bg-emerald-50 text-emerald-600' :
                        js.statut === 'CLOTUREE' ? 'bg-amber-50 text-amber-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>{js.statut === 'OUVERTE' || js.statut === 'EN_ATTENTE_SAISIE' ? 'Ouverte' : js.statut === 'VALIDEE' ? 'Validée' : 'Clôturée'}</span>
                      {ecarts > 0 && <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-600">{ecarts} écarts</span>}
                    </div>
                  </div>
                )
              })}
              {stocks.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Aucune journée.</p>}
            </div>
          </div>
        </div>
      </div>
    </DGCommLayout>
  )
}
