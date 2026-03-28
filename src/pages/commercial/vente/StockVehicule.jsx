import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import VenteLayout from '@/components/commercial/VenteLayout'
import { Loader2, Package, AlertTriangle } from 'lucide-react'

export default function StockVehicule() {
  const { user } = useAuth()
  const [sortie, setSortie] = useState(null)
  const [lignes, setLignes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('sorties_vehicules')
        .select('*, vehicules(immatriculation, nom), itineraires(nom), lignes_sortie_vehicule(*, articles(nom, categorie))')
        .eq('vendeur_id', user.id)
        .in('statut', ['EN_COURS', 'CHARGEMENT', 'EN_VENTE'])
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle()
      setSortie(data)
      setLignes(data?.lignes_sortie_vehicule ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const grouped = {}
  lignes.forEach(l => {
    const cat = l.articles?.categorie ?? 'Autre'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(l)
  })

  if (loading) return <VenteLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-purple-500" size={28} /></div></VenteLayout>

  return (
    <VenteLayout>
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Mon stock véhicule</h1>
      <p className="text-sm text-gray-400 mb-6">Stock chargé dans votre véhicule.</p>

      {!sortie ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">Aucune sortie véhicule active</p>
            <p className="text-xs text-amber-600 mt-1">Contactez votre responsable d'agence pour initier une sortie.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
            <p className="font-mono text-xs text-purple-600">{sortie.numero}</p>
            <p className="font-bold text-purple-800">{sortie.vehicules?.immatriculation} — {sortie.itineraires?.nom ?? 'Sans itinéraire'}</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-800 mt-1 inline-block">{sortie.statut.replace(/_/g, ' ')}</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                {['Article', 'Sorti', 'Vendu', 'Retour', 'Restant'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {Object.entries(grouped).map(([cat, arts]) => (
                  <>{[<tr key={cat}><td colSpan={5} className="px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">{cat}</td></tr>,
                  ...arts.map(l => {
                    const restant = l.quantite_sortie - l.quantite_vendue - l.quantite_retour
                    return (
                      <tr key={l.id}><td className="px-4 py-2.5 font-medium text-gray-700">{l.articles?.nom}</td>
                      <td className="px-4 py-2.5 text-gray-500">{l.quantite_sortie}</td>
                      <td className="px-4 py-2.5 text-green-600 font-medium">{l.quantite_vendue}</td>
                      <td className="px-4 py-2.5 text-orange-600">{l.quantite_retour}</td>
                      <td className={`px-4 py-2.5 font-bold ${restant > 0 ? 'text-purple-700' : 'text-gray-400'}`}>{restant}</td></tr>
                    )
                  })]}</>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </VenteLayout>
  )
}
