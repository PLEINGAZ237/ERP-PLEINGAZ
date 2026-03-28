import CommercialLayout from '@/components/commercial/CommercialLayout'
import { LayoutDashboard, ShoppingCart, FileText, Package, Wallet, ArrowLeftRight } from 'lucide-react'

const NAV = [
  { path: '/commercial/vente', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/commercial/vente/commandes', label: 'Commandes', icon: ShoppingCart },
  { path: '/commercial/vente/factures', label: 'Factures', icon: FileText },
  { path: '/commercial/vente/stock', label: 'Mon stock', icon: Package },
  { path: '/commercial/vente/caisse', label: 'Ma caisse', icon: Wallet },
  { path: '/commercial/vente/boucler', label: 'Boucler ma vente', icon: ArrowLeftRight },
]

export default function VenteLayout({ children }) {
  return <CommercialLayout nav={NAV} title="Commercial" color="purple">{children}</CommercialLayout>
}
