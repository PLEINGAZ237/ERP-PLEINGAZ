import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import CommLayout from '@/components/commercial/CommLayout'
import { Loader2, TrendingUp, Users, MapPin, Package, Calendar } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'
const fmtT = (n) => { const v = parseFloat(n); return isNaN(v) ? '—' : v.toFixed(3) + ' TM' }

export default function AnalysesVentes({ Layout = CommLayout }) {
  const [tab, setTab] = useState('clients')
  const [clients, setClients] = useState([])
  const [agences, setAgences] = useState([])
  const [articles, setArticles] = useState([])
  const [jours, setJours] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: cl }, { data: ag }, { data: ar }, { data: jr }] = await Promise.all([
        supabase.from('v_ventes_par_client').select('*').order('ca_total', { ascending: false }),
        supabase.from('v_ventes_par_agence').select('*').order('ca_total', { ascending: false }),
        supabase.from('v_ventes_par_article').select('*').order('ca_article', { ascending: false }),
        supabase.from('v_ventes_par_jour').select('*').order('date_vente', { ascending: false }).limit(60),
      ])
      setClients(cl ?? [])
      setAgences(ag ?? [])
      setArticles(ar ?? [])
      setJours(jr ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const totalCA = clients.reduce((s, c) => s + (parseFloat(c.ca_total) || 0), 0)
  const totalTonnage = clients.reduce((s, c) => s + (parseFloat(c.tonnage_total) || 0), 0)
  const totalDettes = clients.reduce((s, c) => s + (parseFloat(c.total_dettes) || 0), 0)

  const TABS = [
    { id: 'clients', label: 'Par client', icon: Users },
    { id: 'agences', label: 'Par agence', icon: MapPin },
    { id: 'articles', label: 'Par article', icon: Package },
    { id: 'periodes', label: 'Par période', icon: Calendar },
  ]

  if (loading) return <Layout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></Layout>

  return (
    <Layout>
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Analyses des ventes</h1>
      <p className="text-sm text-gray-400 mb-6">Vue détaillée des ventes par client, agence, article et période.</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={14} className="text-blue-500" /><p className="text-[10px] font-bold uppercase text-blue-600">CA total</p></div>
          <p className="text-lg font-bold text-gray-800">{fmt(totalCA)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><Package size={14} className="text-green-500" /><p className="text-[10px] font-bold uppercase text-green-600">Tonnage GPL</p></div>
          <p className="text-lg font-bold text-gray-800">{fmtT(totalTonnage)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><Users size={14} className="text-red-500" /><p className="text-[10px] font-bold uppercase text-red-600">Dettes totales</p></div>
          <p className="text-lg font-bold text-red-700">{fmt(totalDettes)}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'clients' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                {['Client', 'Catégorie', 'Agence', 'Commandes', 'CA', 'Réglé', 'Dettes', 'Tonnage'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {clients.filter(c => !search || c.client_nom?.toLowerCase().includes(search.toLowerCase())).map(c => (
                  <tr key={c.client_id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{c.client_nom}</td>
                    <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold">{c.categorie}</span></td>
                    <td className="px-4 py-2.5 text-gray-500">{c.agence ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.nb_commandes}</td>
                    <td className="px-4 py-2.5 font-bold">{fmt(c.ca_total)}</td>
                    <td className="px-4 py-2.5 text-green-600">{fmt(c.total_regle)}</td>
                    <td className={`px-4 py-2.5 font-bold ${Number(c.total_dettes) > 0 ? 'text-red-600' : 'text-gray-400'}`}>{Number(c.total_dettes) > 0 ? fmt(c.total_dettes) : '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{fmtT(c.tonnage_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'agences' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                {['Agence', 'Clients', 'Commandes', 'CA', 'Réglé', 'Dettes', 'Tonnage'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {agences.map(a => (
                  <tr key={a.agence_id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-bold text-gray-800">{a.agence_nom}</td>
                    <td className="px-4 py-2.5 text-gray-600">{a.nb_clients}</td>
                    <td className="px-4 py-2.5 text-gray-600">{a.nb_commandes}</td>
                    <td className="px-4 py-2.5 font-bold">{fmt(a.ca_total)}</td>
                    <td className="px-4 py-2.5 text-green-600">{fmt(a.total_regle)}</td>
                    <td className={`px-4 py-2.5 font-bold ${Number(a.total_dettes) > 0 ? 'text-red-600' : 'text-gray-400'}`}>{Number(a.total_dettes) > 0 ? fmt(a.total_dettes) : '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{fmtT(a.tonnage_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'articles' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                {['Article', 'Catégorie', 'Quantité vendue', 'CA', 'Tonnage'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {articles.map(a => (
                  <tr key={a.article_id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{a.article_nom}</td>
                    <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.categorie === 'GPL' ? 'bg-red-50 text-red-700' : a.categorie === 'CONSIGNE' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{a.categorie}</span></td>
                    <td className="px-4 py-2.5 text-gray-600">{a.quantite_vendue}</td>
                    <td className="px-4 py-2.5 font-bold">{fmt(a.ca_article)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{Number(a.tonnage) > 0 ? fmtT(a.tonnage) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'periodes' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                {['Date', 'Factures', 'CA du jour', 'Réglé', 'Tonnage'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {jours.map(j => (
                  <tr key={j.date_vente} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{new Date(j.date_vente).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                    <td className="px-4 py-2.5 text-gray-600">{j.nb_factures}</td>
                    <td className="px-4 py-2.5 font-bold">{fmt(j.ca_jour)}</td>
                    <td className="px-4 py-2.5 text-green-600">{fmt(j.regle_jour)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{fmtT(j.tonnage_jour)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  )
}
