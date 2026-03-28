import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import MagasinLayout from '@/components/commercial/MagasinLayout'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'

export default function MesRapportsStock() {
  const [magasins, setMagasins] = useState([])
  const [selectedMagasin, setSelectedMagasin] = useState('')
  const [journees, setJournees] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [lignesDetail, setLignesDetail] = useState({})

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('magasins').select('id, nom').eq('statut', 'actif').order('nom')
      setMagasins(data ?? [])
      if (data?.length > 0) setSelectedMagasin(data[0].id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedMagasin) return
    const loadJournees = async () => {
      setLoading(true)
      const { data } = await supabase.from('journees_stock')
        .select('*, profiles!ouverte_par(nom, prenom)')
        .eq('magasin_id', selectedMagasin)
        .order('date_journee', { ascending: false }).limit(30)
      setJournees(data ?? [])
      setLoading(false)
    }
    loadJournees()
  }, [selectedMagasin])

  const toggleExpand = async (jsId) => {
    if (expanded === jsId) { setExpanded(null); return }
    setExpanded(jsId)
    if (!lignesDetail[jsId]) {
      const { data } = await supabase.from('lignes_journee_stock')
        .select('*, articles(nom, categorie)')
        .eq('journee_stock_id', jsId)
      
      // Charger aussi les mouvements
      const { data: mvts } = await supabase.from('mouvements_stock')
        .select('*, articles(nom), profiles!effectue_par(nom, prenom)')
        .eq('journee_stock_id', jsId)
        .order('created_at')

      setLignesDetail(prev => ({ ...prev, [jsId]: { lignes: data ?? [], mouvements: mvts ?? [] } }))
    }
  }

  if (loading && !journees.length) return <MagasinLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-green-500" size={28} /></div></MagasinLayout>

  return (
    <MagasinLayout>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Mes rapports stock</h1>
      <p className="text-sm text-gray-400 mb-6">Historique des journées de stock avec détail par article et mouvements.</p>

      <select value={selectedMagasin} onChange={e => setSelectedMagasin(e.target.value)}
        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none mb-5">
        {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
      </select>

      {journees.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">Aucune journée de stock.</p>
      ) : (
        <div className="space-y-3">
          {journees.map(js => {
            const isOpen = expanded === js.id
            const detail = lignesDetail[js.id]
            return (
              <div key={js.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50" onClick={() => toggleExpand(js.id)}>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{new Date(js.date_journee).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <p className="text-xs text-gray-400">Ouvert par {js.profiles?.prenom} {js.profiles?.nom}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      js.statut === 'VALIDEE' ? 'bg-green-100 text-green-700' :
                      js.statut === 'CLOTUREE' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>{js.statut}</span>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {isOpen && detail && (
                  <div className="border-t px-5 py-4 bg-gray-50/50 space-y-4">
                    {/* Tableau articles */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-white border-b"><tr>
                          {['Article', 'Ouverture', 'Entrées', 'Sorties', 'Théorique', 'Physique', 'Écart'].map(h => (
                            <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {(detail.lignes ?? []).map(l => {
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
                                <td className="px-3 py-2 font-bold">{phys}</td>
                                <td className={`px-3 py-2 font-bold ${ecart !== 0 ? (ecart > 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>
                                  {ecart !== 0 ? (ecart > 0 ? `+${ecart}` : ecart) : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mouvements détaillés */}
                    {(detail.mouvements ?? []).length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-2">Mouvements détaillés</p>
                        <div className="divide-y divide-gray-100 bg-white rounded-lg border border-gray-100">
                          {(detail.mouvements ?? []).map(m => (
                            <div key={m.id} className="px-3 py-2 flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium text-gray-700">{m.articles?.nom} — {m.motif ?? m.type}</p>
                                <p className="text-[10px] text-gray-400">{m.description ?? '—'} · {m.profiles?.prenom} {m.profiles?.nom} · {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                              <p className={`text-xs font-bold ${m.type === 'entree' ? 'text-green-600' : 'text-red-600'}`}>
                                {m.type === 'entree' ? '+' : '-'}{m.quantite}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </MagasinLayout>
  )
}
