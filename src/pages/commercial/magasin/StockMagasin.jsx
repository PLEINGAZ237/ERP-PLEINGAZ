import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import MagasinLayout from '@/components/commercial/MagasinLayout'
import { Loader2, Package } from 'lucide-react'

export default function StockMagasin() {
  const [magasins, setMagasins] = useState([])
  const [selectedMagasin, setSelectedMagasin] = useState('')
  const [lignes, setLignes] = useState([])
  const [loading, setLoading] = useState(true)

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
    const loadStock = async () => {
      const { data: js } = await supabase.from('journees_stock')
        .select('id').eq('magasin_id', selectedMagasin)
        .order('date_journee', { ascending: false }).limit(1).maybeSingle()
      if (js) {
        const { data: lg } = await supabase.from('lignes_journee_stock')
          .select('*, articles(nom, categorie)').eq('journee_stock_id', js.id)
        setLignes(lg ?? [])
      } else {
        setLignes([])
      }
    }
    loadStock()
  }, [selectedMagasin])

  const groupedLignes = {}
  lignes.forEach(l => {
    const cat = l.articles?.categorie ?? 'Autre'
    if (!groupedLignes[cat]) groupedLignes[cat] = []
    groupedLignes[cat].push(l)
  })

  if (loading) return <MagasinLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-green-500" size={28} /></div></MagasinLayout>

  return (
    <MagasinLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Mon stock</h1>
          <p className="text-sm text-gray-400">État actuel du stock par article.</p>
        </div>
        <select value={selectedMagasin} onChange={e => setSelectedMagasin(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none">
          {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
      </div>

      {lignes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Package size={32} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 text-sm">Aucune donnée de stock. Ouvrez une journée de stock d'abord.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              {['Article', 'Ouverture', 'Entrées', 'Sorties', 'Stock actuel'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {Object.entries(groupedLignes).map(([cat, arts]) => [
                <tr key={`cat-${cat}`}><td colSpan={5} className="px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">{cat}</td></tr>,
                ...arts.map(l => {
                  const actuel = l.stock_ouverture + l.total_entrees - l.total_sorties
                  return (
                    <tr key={l.id}>
                      <td className="px-4 py-2.5 font-medium text-gray-700">{l.articles?.nom}</td>
                      <td className="px-4 py-2.5 text-gray-500">{l.stock_ouverture}</td>
                      <td className="px-4 py-2.5 text-green-600">{l.total_entrees > 0 ? `+${l.total_entrees}` : '—'}</td>
                      <td className="px-4 py-2.5 text-red-600">{l.total_sorties > 0 ? `-${l.total_sorties}` : '—'}</td>
                      <td className="px-4 py-2.5 font-bold text-gray-800">{actuel}</td>
                    </tr>
                  )
                })
              ])}
            </tbody>
          </table>
        </div>
      )}
    </MagasinLayout>
  )
}
