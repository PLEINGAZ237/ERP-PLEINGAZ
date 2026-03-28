import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import VenteLayout from '@/components/commercial/VenteLayout'
import { Loader2, Wallet } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function CaisseVente() {
  const { user } = useAuth()
  const [reglements, setReglements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('reglements')
        .select('*, factures(numero, commandes(clients(nom_interne)))')
        .eq('encaisse_par', user.id)
        .order('created_at', { ascending: false })
      setReglements(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const totalCash = reglements.filter(r => r.mode === 'cash').reduce((s, r) => s + Number(r.montant), 0)
  const totalBanque = reglements.filter(r => r.mode !== 'cash').reduce((s, r) => s + Number(r.montant), 0)
  const total = reglements.reduce((s, r) => s + Number(r.montant), 0)

  if (loading) return <VenteLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-purple-500" size={28} /></div></VenteLayout>

  return (
    <VenteLayout>
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Ma caisse</h1>
      <p className="text-sm text-gray-400 mb-6">Encaissements effectués par vous.</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase text-green-600">Cash</p>
          <p className="text-lg font-bold text-green-700">{fmt(totalCash)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase text-blue-600">Banque / Chèque</p>
          <p className="text-lg font-bold text-blue-700">{fmt(totalBanque)}</p>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <p className="text-[10px] font-bold uppercase text-purple-600">Total</p>
          <p className="text-xl font-black text-purple-800">{fmt(total)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b"><h2 className="font-semibold text-gray-700 text-sm">Mes encaissements</h2></div>
        {reglements.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">Aucun encaissement.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {reglements.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{r.factures?.commandes?.clients?.nom_interne ?? '—'}</p>
                  <p className="text-xs text-gray-400">{r.factures?.numero} · {r.mode} · {new Date(r.created_at).toLocaleDateString('fr-FR')} {new Date(r.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <p className="font-bold text-green-600">+{fmt(r.montant)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </VenteLayout>
  )
}
