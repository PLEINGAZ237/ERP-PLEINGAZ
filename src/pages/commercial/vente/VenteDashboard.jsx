import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import VenteLayout from '@/components/commercial/VenteLayout'
import { Loader2, Package, Wallet, ShoppingCart, AlertTriangle } from 'lucide-react'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—'

export default function VenteDashboard() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const [sortieActive, setSortieActive] = useState(null)
  const [lignesStock, setLignesStock] = useState([])
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: sv } = await supabase.from('sorties_vehicules')
        .select('*, vehicules(immatriculation, nom), itineraires(nom), lignes_sortie_vehicule(*, articles(nom, categorie))')
        .eq('vendeur_id', user.id)
        .in('statut', ['EN_COURS', 'CHARGEMENT', 'EN_VENTE'])
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle()

      if (sv) {
        setSortieActive(sv)
        setLignesStock(sv.lignes_sortie_vehicule ?? [])
      }

      const { data: cmd } = await supabase.from('commandes')
        .select('*, clients(nom_interne), lignes_commande(montant)')
        .eq('cree_par', user.id)
        .order('created_at', { ascending: false }).limit(10)
      setCommandes(cmd ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const getTotal = (c) => c.lignes_commande?.reduce((s, l) => s + Number(l.montant || 0), 0) ?? 0
  const totalStock = lignesStock.reduce((s, l) => s + (l.quantite_sortie - l.quantite_vendue - l.quantite_retour), 0)

  if (loading) return <VenteLayout><div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-purple-500" size={28} /></div></VenteLayout>

  return (
    <VenteLayout>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Bonjour, {profile?.prenom} 👋</h1>
        <p className="text-sm text-gray-400">Commercial — ventes terrain et gestion de stock véhicule.</p>
      </div>

      {!sortieActive ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">Aucune sortie véhicule active</p>
            <p className="text-xs text-amber-600 mt-1">Contactez votre responsable d'agence pour initier une sortie véhicule.</p>
          </div>
        </div>
      ) : (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-mono text-xs text-purple-600">{sortieActive.numero}</p>
              <p className="font-bold text-purple-800">{sortieActive.vehicules?.immatriculation}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-200 text-purple-800">{sortieActive.statut.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-sm text-purple-700">{sortieActive.itineraires?.nom ?? 'Sans itinéraire'}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2"><Package size={16} className="text-purple-500" /><p className="text-[10px] font-bold uppercase text-purple-600">Stock restant</p></div>
          <p className="text-2xl font-bold text-gray-800">{totalStock} <span className="text-sm font-normal text-gray-400">unités</span></p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2"><ShoppingCart size={16} className="text-blue-500" /><p className="text-[10px] font-bold uppercase text-blue-600">Commandes</p></div>
          <p className="text-2xl font-bold text-gray-800">{commandes.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2"><Wallet size={16} className="text-green-500" /><p className="text-[10px] font-bold uppercase text-green-600">Mes ventes du jour</p></div>
          <p className="text-2xl font-bold text-gray-800">{fmt(commandes.filter(c => c.statut === 'REGLEE' || c.statut === 'LIVREE').reduce((s, c) => s + getTotal(c), 0))}</p>
        </div>
      </div>

      {sortieActive && lignesStock.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-4">Mon stock véhicule</h2>
          <div className="divide-y divide-gray-50">
            {lignesStock.map(l => {
              const restant = l.quantite_sortie - l.quantite_vendue - l.quantite_retour
              return (
                <div key={l.id} className="flex items-center justify-between py-2.5">
                  <p className="text-sm font-medium text-gray-700">{l.articles?.nom}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-400">Sorti: {l.quantite_sortie}</span>
                    <span className="text-green-600">Vendu: {l.quantite_vendue}</span>
                    <span className={`font-bold ${restant > 0 ? 'text-purple-700' : 'text-gray-400'}`}>Restant: {restant}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {sortieActive && (
        <Link to="/commercial/vente/commandes/creer"
          className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-700 shadow-lg shadow-purple-500/20">
          <ShoppingCart size={16} /> Nouvelle vente client
        </Link>
      )}
    </VenteLayout>
  )
}
