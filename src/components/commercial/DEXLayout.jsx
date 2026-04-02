import CommercialLayout from '@/components/commercial/CommercialLayout'
import { LayoutDashboard, BarChart3, Wallet, Package, History } from 'lucide-react'

const NAV = [
  { path: '/commercial/dex', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/commercial/dex/analyses', label: 'Analyses ventes', icon: BarChart3 },
  { path: '/commercial/dex/rapports-caisse', label: 'Rapports caisse', icon: Wallet },
  { path: '/commercial/dex/rapports-stock', label: 'Rapports stock', icon: Package },
  { path: '/commercial/dex/audit', label: 'Journal d\'audit', icon: History },
]

export default function DEXLayout({ children }) {
  return <CommercialLayout nav={NAV} title="DFC / Direction Exploitation" color="indigo">{children}</CommercialLayout>
}
