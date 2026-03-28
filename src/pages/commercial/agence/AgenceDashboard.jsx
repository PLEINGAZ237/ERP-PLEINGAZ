import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import RespAgenceLayout from '@/components/commercial/RespAgenceLayout'
import { Loader2, Plus, Truck, ShoppingCart } from 'lucide-react'

const STATUT_STYLE = {
  BROUILLON: 'bg-gray-100 text-gray-600', FACTUREE: 'bg-blue-100 text-blue-700',
  REGLEE: 'bg-green-100 text-green-700', EN_ATTENTE_DG: 'bg-red-100 text-red-700',
  LIVREE: 'bg-purple-100 text-purple-700',
}
const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function AgenceDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [commandes, setCommandes] = useState([])
  const [sorties, setSorties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: cmd }, { data: sv }] = await Promise.all([
        supabase.from('commandes').select('*, clients(nom_interne), lignes_commande(montant)')
          .order('created_at', { ascending: false }).limit(10),
        supabase.from('sorties_vehicules').select('*, vehicules(immatriculation, nom), profiles!vendeur_id(nom, prenom), itineraires(nom)')
          .order('created_at', { ascending: false }).limit(10),
      ])
      setCommandes(cmd ?? [])
      setSorties(sv ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const getTotal = (c) => c.lignes_commande?.reduce((s, l) => s + Number(l.montant || 0), 0) ?? 0
  const svEnCours = sorties.filter(s => !['BOUCLEE', 'ANNULEE'].includes(s.statut)).length

  if (loading) return <RespAgenceLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-teal-500" size={28} /></div></RespAgenceLayout>

  return (
    <RespAgenceLayout>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Bonjour, {profile?.prenom} 👋</h1>
        <p className="text-sm text-gray-400">Responsable d'agence — commandes, factures et sorties véhicules.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Commandes', value: commandes.length, color: 'text-blue-600', icon: ShoppingCart },
          { label: 'Sorties en cours', value: svEnCours, color: 'text-teal-600', icon: Truck },
          { label: 'Réglées', value: commandes.filter(c => c.statut === 'REGLEE' || c.statut === 'LIVREE').length, color: 'text-green-600' },
          { label: 'Attente DG', value: commandes.filter(c => c.statut === 'EN_ATTENTE_DG').length, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className={`text-[10px] font-bold uppercase ${s.color}`}>{s.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <h2 className="font-semibold text-gray-700 text-sm">Dernières commandes</h2>
            <Link to="/commercial/agence/commandes" className="text-sm text-teal-600 hover:underline">Voir tout →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {commandes.slice(0, 5).map(c => (
              <div key={c.id} onClick={() => navigate(`/commercial/agence/commandes/${c.id}`)} className="px-5 py-3 hover:bg-gray-50/50 cursor-pointer">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-mono text-xs text-teal-600">{c.numero}</p>
                    <p className="text-sm font-medium text-gray-700">{c.clients?.nom_interne}</p>
                  </div>
                  <p className="font-bold text-sm">{fmt(getTotal(c))}</p>
                </div>
              </div>
            ))}
            {commandes.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Aucune commande.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <h2 className="font-semibold text-gray-700 text-sm">Sorties véhicules</h2>
            <Link to="/commercial/agence/sorties" className="text-sm text-teal-600 hover:underline">Voir tout →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {sorties.slice(0, 5).map(s => (
              <div key={s.id} onClick={() => navigate(`/commercial/agence/sorties/${s.id}`)} className="px-5 py-3 hover:bg-gray-50/50 cursor-pointer">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-mono text-xs text-teal-600">{s.numero}</p>
                    <p className="text-sm text-gray-700">{s.vehicules?.immatriculation} — {s.profiles?.prenom} {s.profiles?.nom}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.statut === 'BOUCLEE' ? 'bg-green-100 text-green-700' : s.statut === 'EN_VENTE' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                    {s.statut.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
            {sorties.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Aucune sortie.</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Link to="/commercial/agence/commandes/creer" className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-700">
          <ShoppingCart size={16} /> Nouvelle commande
        </Link>
        <Link to="/commercial/agence/sorties/creer" className="flex items-center gap-2 bg-teal-600/10 text-teal-700 border border-teal-200 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-50">
          <Truck size={16} /> Sortie véhicule
        </Link>
      </div>
    </RespAgenceLayout>
  )
}
