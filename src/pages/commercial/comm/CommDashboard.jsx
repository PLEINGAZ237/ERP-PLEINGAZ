import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import CommLayout from '@/components/commercial/CommLayout'
import { Loader2, Plus } from 'lucide-react'

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

export default function CommDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('commandes')
        .select('*, clients(nom_interne), profiles!cree_par(nom, prenom), lignes_commande(quantite, prix_unitaire, montant)')
        .order('created_at', { ascending: false })
        .limit(20)
      setCommandes(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const stats = {
    brouillon: commandes.filter(c => c.statut === 'BROUILLON').length,
    aFacturer: commandes.filter(c => c.statut === 'A_FACTURER' || c.statut === 'FACTUREE').length,
    reglees: commandes.filter(c => c.statut === 'REGLEE' || c.statut === 'LIVREE').length,
  }

  const getTotal = (c) => c.lignes_commande?.reduce((s, l) => s + Number(l.montant || 0), 0) ?? 0

  return (
    <CommLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Bonjour, {profile?.prenom} 👋</h1>
          <p className="text-sm text-gray-400">Service commercial — gestion des commandes et factures.</p>
        </div>
        <Link to="/commercial/comm/commandes/creer"
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20">
          <Plus size={18} /> Nouvelle commande
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Brouillons', value: stats.brouillon, color: 'text-gray-600' },
          { label: 'En cours', value: stats.aFacturer, color: 'text-amber-600' },
          { label: 'Réglées / Livrées', value: stats.reglees, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className={`text-[10px] font-bold uppercase ${s.color}`}>{s.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="font-semibold text-gray-700 text-sm">Dernières commandes</h2>
          <Link to="/commercial/comm/commandes" className="text-sm text-blue-600 hover:underline">Voir tout →</Link>
        </div>
        {loading ? (
          <div className="flex flex-col items-center py-16 text-gray-400"><Loader2 className="animate-spin mb-2" /><p className="text-sm">Chargement...</p></div>
        ) : commandes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm mb-4">Aucune commande pour le moment.</p>
            <Link to="/commercial/comm/commandes/creer" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Créer une commande</Link>
          </div>
        ) : (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Numéro', 'Client', 'Montant', 'Date', 'Statut'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {commandes.slice(0, 15).map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate(`/commercial/comm/commandes/${c.id}`)}>
                    <td className="px-5 py-3 font-mono text-xs text-blue-600">{c.numero}</td>
                    <td className="px-5 py-3 font-medium text-gray-700">{c.clients?.nom_interne}</td>
                    <td className="px-5 py-3 font-bold whitespace-nowrap">{fmt(getTotal(c))}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${STATUT_STYLE[c.statut] ?? ''}`}>{STATUT_LABEL[c.statut]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CommLayout>
  )
}
