import CommercialLayout from '@/components/commercial/CommercialLayout'
import { LayoutDashboard, FileText, ShoppingCart, Wallet, Landmark, BookOpen, Users, ClipboardList, ArrowLeftRight } from 'lucide-react'

const NAV = [
  { path: '/commercial/caisse', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/commercial/caisse/gestion', label: 'Gestion caisse', icon: BookOpen },
  { path: '/commercial/caisse/commandes', label: 'Commandes', icon: ShoppingCart },
  { path: '/commercial/caisse/factures', label: 'Factures', icon: FileText },
  { path: '/commercial/caisse/encaissements', label: 'Encaissements', icon: Wallet },
  { path: '/commercial/caisse/versements', label: 'Versements comm.', icon: Users },
  { path: '/commercial/caisse/transferts', label: 'Transferts reçus', icon: ArrowLeftRight },
  { path: '/commercial/caisse/mes-rapports', label: 'Mes rapports', icon: ClipboardList },
]

export default function CaisseLayout({ children }) {
  return <CommercialLayout nav={NAV} title="Caisse" color="amber">{children}</CommercialLayout>
}
