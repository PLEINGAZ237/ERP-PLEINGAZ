import CommercialLayout from '@/components/commercial/CommercialLayout'
import { LayoutDashboard, BarChart3, Wallet, Package, History } from 'lucide-react'

const NAV = [
  { path: '/commercial/comptable', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/commercial/comptable/analyses', label: 'Analyses ventes', icon: BarChart3 },
  { path: '/commercial/comptable/rapports-caisse', label: 'Rapports caisse', icon: Wallet },
  { path: '/commercial/comptable/rapports-stock', label: 'Rapports stock', icon: Package },
  { path: '/commercial/comptable/audit', label: 'Journal d\'audit', icon: History },
]

export default function ComptableLayout({ children }) {
  return <CommercialLayout nav={NAV} title="Comptabilité" color="cyan">{children}</CommercialLayout>
}
