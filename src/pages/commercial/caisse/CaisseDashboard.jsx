import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import CaisseLayout from '@/components/commercial/CaisseLayout'
import { Loader2, ShoppingCart, Wallet, Plus } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function CaisseDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [reglements, setReglements] = useState([])
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: reg }, { data: cmd }] = await Promise.all([
        supabase.from('reglements').select('*, factures(numero, commandes(clients(nom_interne)))').order('created_at', { ascending: false }).limit(20),
        supabase.from('commandes').select('*, clients(nom_interne), lignes_commande(montant)').in('statut', ['BROUILLON', 'FACTUREE']).order('created_at', { ascending: false }).limit(10),
      ])
      setReglements(reg ?? [])
      setCommandes(cmd ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const totalCash = reglements.filter(r => r.mode === 'cash').reduce((s, r) => s + Number(r.montant), 0)
  const totalBanque = reglements.filter(r => r.mode === 'banque').reduce((s, r) => s + Number(r.montant), 0)

  if (loading) return <CaisseLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-amber-500" size={28} /></div></CaisseLayout>

  return (
    <CaisseLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Bonjour, {profile?.prenom} 👋</h1>
          <p className="text-sm text-gray-400">Caisse — facturation, encaissements et versements.</p>
        </div>
        <Link to="/commercial/caisse/commandes/creer"
          className="flex items-center gap-2 bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-700">
          <Plus size={18} /> Nouvelle commande
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2"><Wallet size={16} className="text-green-500" /><p className="text-[10px] font-bold uppercase text-green-600">Cash encaissé</p></div>
          <p className="text-2xl font-bold text-gray-800">{fmt(totalCash)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2"><Wallet size={16} className="text-blue-500" /><p className="text-[10px] font-bold uppercase text-blue-600">Banque</p></div>
          <p className="text-2xl font-bold text-gray-800">{fmt(totalBanque)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2"><ShoppingCart size={16} className="text-amber-500" /><p className="text-[10px] font-bold uppercase text-amber-600">À traiter</p></div>
          <p className="text-2xl font-bold text-gray-800">{commandes.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="font-semibold text-gray-700 text-sm">Derniers encaissements</h2>
        </div>
        {reglements.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">Aucun encaissement.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {reglements.slice(0, 10).map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{r.factures?.commandes?.clients?.nom_interne ?? '—'}</p>
                  <p className="text-xs text-gray-400">{r.factures?.numero} · {r.mode} · {new Date(r.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <p className="font-bold text-gray-800">{fmt(r.montant)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </CaisseLayout>
  )
}
