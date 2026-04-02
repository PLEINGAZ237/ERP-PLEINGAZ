import CommercialLayout from '@/components/commercial/CommercialLayout'
import { LayoutDashboard, ShoppingCart, FileText, List, BarChart3, Wallet } from 'lucide-react'

const NAV = [
  { path: '/commercial/comm', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/commercial/comm/commandes', label: 'Commandes', icon: ShoppingCart },
  { path: '/commercial/comm/factures', label: 'Factures', icon: FileText },
  { path: '/commercial/comm/clients', label: 'Clients', icon: List },
  { path: '/commercial/comm/analyses', label: 'Analyses ventes', icon: BarChart3 },
  { path: '/commercial/comm/rapports-caisse', label: 'Rapports caisse', icon: Wallet },
]

export default function CommLayout({ children }) {
  return <CommercialLayout nav={NAV} title="Service Commercial" color="blue">{children}</CommercialLayout>
}
