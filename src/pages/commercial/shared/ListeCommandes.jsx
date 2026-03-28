import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import CommLayout from '@/components/commercial/CommLayout'
import { Loader2, Plus, Search } from 'lucide-react'

const STATUT_STYLE = {
  BROUILLON: 'bg-gray-100 text-gray-600', A_FACTURER: 'bg-amber-100 text-amber-700',
  FACTUREE: 'bg-blue-100 text-blue-700', REGLEE: 'bg-green-100 text-green-700',
  EN_ATTENTE_DG: 'bg-red-100 text-red-700', LIVREE: 'bg-purple-100 text-purple-700',
  ANNULEE: 'bg-gray-200 text-gray-500',
}
const STATUT_LABEL = {
  BROUILLON: 'Brouillon', A_FACTURER: 'À facturer', FACTUREE: 'Facturée',
  REGLEE: 'Réglée', EN_ATTENTE_DG: 'Attente DG', LIVREE: 'Livrée', ANNULEE: 'Annulée',
}
const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function ListeCommandes({ Layout = CommLayout, basePath = '/commercial/comm/commandes', creerPath = '/commercial/comm/commandes/creer' }) {
  const navigate = useNavigate()
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('commandes').select('*, clients(nom_interne), profiles!cree_par(nom, prenom), lignes_commande(montant)').order('created_at', { ascending: false })
      setCommandes(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const getTotal = (c) => c.lignes_commande?.reduce((s, l) => s + Number(l.montant || 0), 0) ?? 0
  const filtered = commandes.filter(c => {
    if (filtre && c.statut !== filtre) return false
    if (search) { const q = search.toLowerCase(); if (!c.numero.toLowerCase().includes(q) && !c.clients?.nom_interne?.toLowerCase().includes(q)) return false }
    return true
  })

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Commandes</h1>
        <Link to={creerPath} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"><Plus size={18} /> Nouvelle commande</Link>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par numéro ou client..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
        </div>
        <select value={filtre} onChange={e => setFiltre(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="flex flex-col items-center py-20 text-gray-400"><Loader2 className="animate-spin mb-2" /><p className="text-sm">Chargement...</p></div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">Aucune commande trouvée.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>{['Numéro', 'Client', 'Créé par', 'Montant', 'Date', 'Statut'].map(h => (
                <th key={h} className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">{h}</th>
              ))}</tr></thead>
              <tbody className="divide-y divide-gray-50">{filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate(`${basePath}/${c.id}`)}>
                  <td className="px-5 py-3 font-mono text-xs text-blue-600">{c.numero}</td>
                  <td className="px-5 py-3 font-medium text-gray-700">{c.clients?.nom_interne}</td>
                  <td className="px-5 py-3 text-gray-500">{c.profiles?.prenom} {c.profiles?.nom}</td>
                  <td className="px-5 py-3 font-bold whitespace-nowrap">{fmt(getTotal(c))}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${STATUT_STYLE[c.statut] ?? ''}`}>{STATUT_LABEL[c.statut]}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-gray-50">{filtered.map(c => (
            <div key={c.id} onClick={() => navigate(`${basePath}/${c.id}`)} className="p-4 active:bg-gray-50 cursor-pointer">
              <div className="flex justify-between items-start mb-1">
                <p className="font-mono text-xs text-blue-600 font-medium">{c.numero}</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUT_STYLE[c.statut] ?? ''}`}>{STATUT_LABEL[c.statut]}</span>
              </div>
              <p className="text-sm font-medium text-gray-800">{c.clients?.nom_interne}</p>
              <div className="flex justify-between mt-2"><p className="text-sm font-bold">{fmt(getTotal(c))}</p><p className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString('fr-FR')}</p></div>
            </div>
          ))}</div>
        </div>
      )}
    </Layout>
  )
}
