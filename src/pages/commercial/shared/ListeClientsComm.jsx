import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import CommLayout from '@/components/commercial/CommLayout'
import { Loader2, Search } from 'lucide-react'

export default function ListeClientsComm({ Layout = CommLayout }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('clients')
        .select('*, categories_clients(nom), agences(nom)')
        .eq('statut', 'actif').order('nom_interne')
      setClients(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = search
    ? clients.filter(c => c.nom_interne.toLowerCase().includes(search.toLowerCase()) || c.nom_responsable?.toLowerCase().includes(search.toLowerCase()) || c.ville?.toLowerCase().includes(search.toLowerCase()))
    : clients

  return (
    <Layout>
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Clients</h1>
      <p className="text-sm text-gray-400 mb-6">Liste de vos clients actifs.</p>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, responsable, ville..."
          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">Aucun client trouvé.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                {['Nom', 'Responsable', 'Catégorie', 'Ville', 'Téléphone', 'Agence'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.nom_interne}</td>
                    <td className="px-4 py-3 text-gray-600">{c.nom_responsable ?? '—'}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold">{c.categories_clients?.nom}</span></td>
                    <td className="px-4 py-3 text-gray-500">{c.ville ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.telephone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.agences?.nom ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-gray-50">
            {filtered.map(c => (
              <div key={c.id} className="p-4">
                <p className="font-medium text-gray-800 text-sm">{c.nom_interne}</p>
                <p className="text-xs text-gray-400">{c.categories_clients?.nom} · {c.ville ?? ''} · {c.telephone ?? ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  )
}
