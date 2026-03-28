import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import MagasinLayout from '@/components/commercial/MagasinLayout'
import { Loader2, Package, ArrowUpFromLine, CheckCircle } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') : '—'

export default function MagasinDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [livraisons, setLivraisons] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('bons_livraison')
        .select('*, factures(numero, montant_total, commandes(numero, clients(nom_interne))), magasins(nom)')
        .order('created_at', { ascending: false })
      setLivraisons(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const aLivrer = livraisons.filter(l => l.statut === 'A_LIVRER')
  const livrees = livraisons.filter(l => l.statut === 'LIVRE')

  if (loading) return <MagasinLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-green-500" size={28} /></div></MagasinLayout>

  return (
    <MagasinLayout>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Bonjour, {profile?.prenom} 👋</h1>
        <p className="text-sm text-gray-400">Magasin — gestion du stock et livraisons.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2"><ArrowUpFromLine size={16} className="text-amber-500" /><p className="text-[10px] font-bold uppercase text-amber-600">À livrer</p></div>
          <p className="text-3xl font-bold text-gray-800">{aLivrer.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2"><CheckCircle size={16} className="text-green-500" /><p className="text-[10px] font-bold uppercase text-green-600">Livrées</p></div>
          <p className="text-3xl font-bold text-gray-800">{livrees.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b">
          <h2 className="font-semibold text-gray-700 text-sm">Livraisons en attente</h2>
        </div>
        {aLivrer.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">Aucune livraison en attente.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {aLivrer.map(bl => (
              <div key={bl.id} onClick={() => navigate(`/commercial/magasin/livraisons/${bl.id}`)} className="px-5 py-4 hover:bg-gray-50/50 cursor-pointer">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-xs text-green-600 font-medium">{bl.numero}</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{bl.factures?.commandes?.clients?.nom_interne}</p>
                    <p className="text-xs text-gray-400">Facture {bl.factures?.numero} — {bl.magasins?.nom}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">À livrer</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MagasinLayout>
  )
}
