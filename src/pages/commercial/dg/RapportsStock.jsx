import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DGCommLayout from '@/components/commercial/DGCommLayout'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'

export default function RapportsStock({ Layout = DGCommLayout }) {
  const [journees, setJournees] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [lignesDetail, setLignesDetail] = useState({})

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('journees_stock')
        .select('*, magasins(nom), profiles!ouverte_par(nom, prenom)')
        .order('date_journee', { ascending: false })
      setJournees(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const toggleExpand = async (jsId) => {
    if (expanded === jsId) { setExpanded(null); return }
    setExpanded(jsId)
    if (!lignesDetail[jsId]) {
      const { data } = await supabase.from('lignes_journee_stock')
        .select('*, articles(nom, categorie)')
        .eq('journee_stock_id', jsId)
        .order('articles(categorie), articles(nom)')
      setLignesDetail(prev => ({ ...prev, [jsId]: data ?? [] }))
    }
  }

  if (loading) return <Layout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin" size={28} /></div></Layout>

  return (
    <Layout>
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Rapports stock</h1>
      <p className="text-sm text-gray-400 mb-6">Historique des journées de stock avec détails par article.</p>

      {journees.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">Aucune journée de stock.</p>
      ) : (
        <div className="space-y-3">
          {journees.map(js => {
            const isOpen = expanded === js.id
            return (
              <div key={js.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50" onClick={() => toggleExpand(js.id)}>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{js.magasins?.nom}</p>
                    <p className="text-xs text-gray-400">{new Date(js.date_journee).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${js.statut === 'CLOTUREE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {js.statut === 'CLOTUREE' ? 'Clôturée' : 'Ouverte'}
                    </span>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t px-5 py-4 bg-gray-50/50">
                    {(lignesDetail[js.id] ?? []).length === 0 ? (
                      <p className="text-xs text-gray-400">Chargement...</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-white border-b">
                            <tr>
                              {['Article', 'Ouverture', 'Entrées', 'Sorties', 'Théorique', 'Physique', 'Écart'].map(h => (
                                <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(lignesDetail[js.id] ?? []).map(l => {
                              const theo = l.stock_ouverture + l.total_entrees - l.total_sorties
                              const phys = l.stock_physique ?? theo
                              const ecart = phys - theo
                              return (
                                <tr key={l.id} className={ecart !== 0 ? 'bg-red-50/50' : ''}>
                                  <td className="px-3 py-2 font-medium text-gray-700">{l.articles?.nom}</td>
                                  <td className="px-3 py-2 text-gray-500">{l.stock_ouverture}</td>
                                  <td className="px-3 py-2 text-green-600">{l.total_entrees > 0 ? `+${l.total_entrees}` : '—'}</td>
                                  <td className="px-3 py-2 text-red-600">{l.total_sorties > 0 ? `-${l.total_sorties}` : '—'}</td>
                                  <td className="px-3 py-2 font-bold text-gray-800">{theo}</td>
                                  <td className="px-3 py-2 font-bold text-gray-800">{phys}</td>
                                  <td className={`px-3 py-2 font-bold ${ecart !== 0 ? (ecart > 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>
                                    {ecart !== 0 ? (ecart > 0 ? `+${ecart}` : ecart) : '—'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
