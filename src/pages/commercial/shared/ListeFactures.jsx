import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import CommLayout from '@/components/commercial/CommLayout'
import { Loader2, Search } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'
const STATUT_STYLE = {
  EN_ATTENTE: 'bg-amber-100 text-amber-700', REGLEE: 'bg-green-100 text-green-700',
  PARTIELLE: 'bg-blue-100 text-blue-700', EN_ATTENTE_DG: 'bg-red-100 text-red-700',
  DETTE_VALIDEE: 'bg-purple-100 text-purple-700', ANNULEE: 'bg-gray-200 text-gray-500',
}

export default function ListeFactures({ Layout = CommLayout, basePath = '/commercial/comm/commandes' }) {
  const navigate = useNavigate()
  const [factures, setFactures] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('factures')
        .select('*, commandes(id, numero, clients(nom_interne)), magasins(nom), profiles!facture_par(nom, prenom)')
        .order('created_at', { ascending: false })
      setFactures(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = factures.filter(f => {
    if (filtre && f.statut !== filtre) return false
    if (search) {
      const q = search.toLowerCase()
      if (!f.numero.toLowerCase().includes(q) && !f.commandes?.clients?.nom_interne?.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <Layout>
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Factures</h1>
      <p className="text-sm text-gray-400 mb-6">Liste de toutes les factures.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none" />
        </div>
        <select value={filtre} onChange={e => setFiltre(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none">
          <option value="">Tous les statuts</option>
          <option value="EN_ATTENTE">En attente</option>
          <option value="REGLEE">Réglée</option>
          <option value="EN_ATTENTE_DG">Attente DG</option>
          <option value="DETTE_VALIDEE">Dette validée</option>
          <option value="ANNULEE">Annulée</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">Aucune facture trouvée.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                {['Numéro', 'Client', 'Magasin', 'Total', 'Réglé', 'Dette', 'Date', 'Statut'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate(`${basePath}/${f.commandes?.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">{f.numero}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{f.commandes?.clients?.nom_interne}</td>
                    <td className="px-4 py-3 text-gray-500">{f.magasins?.nom}</td>
                    <td className="px-4 py-3 font-bold">{fmt(f.montant_total)}</td>
                    <td className="px-4 py-3 text-green-600">{fmt(f.montant_regle)}</td>
                    <td className="px-4 py-3 text-red-600 font-bold">{f.montant_total - f.montant_regle > 0 ? fmt(f.montant_total - f.montant_regle) : '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(f.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUT_STYLE[f.statut] ?? ''}`}>{f.statut.replace(/_/g, ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-gray-50">
            {filtered.map(f => (
              <div key={f.id} onClick={() => navigate(`${basePath}/${f.commandes?.id}`)} className="p-4 active:bg-gray-50 cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-mono text-xs text-blue-600">{f.numero}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUT_STYLE[f.statut] ?? ''}`}>{f.statut.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-sm font-medium text-gray-800">{f.commandes?.clients?.nom_interne}</p>
                <div className="flex justify-between mt-2">
                  <p className="text-sm font-bold">{fmt(f.montant_total)}</p>
                  <p className="text-xs text-gray-400">{new Date(f.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  )
}
