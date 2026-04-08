import CommercialLayout from '@/components/commercial/CommercialLayout'
import { LayoutDashboard, AlertTriangle, FileText, Wallet, Package, ClipboardList, History, BarChart3, RotateCcw, Gift } from 'lucide-react'

const NAV = [
  { path: '/commercial/dg', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/commercial/dg/dettes', label: 'Dettes en attente', icon: AlertTriangle },
  { path: '/commercial/dg/retours', label: 'Retours & Décons.', icon: RotateCcw, Gift },
  { path: '/commercial/dg/publicites', label: 'Ordres de publicité', icon: Gift },
  { path: '/commercial/dg/analyses', label: 'Analyses ventes', icon: BarChart3 },
  { path: '/commercial/dg/rapports-caisse', label: 'Rapports caisse', icon: Wallet },
  { path: '/commercial/dg/rapports-stock', label: 'Rapports stock', icon: Package },
  { path: '/commercial/dg/inventaires', label: 'Inventaires', icon: ClipboardList },
  { path: '/commercial/dg/audit', label: 'Journal d\'audit', icon: History },
]

export default function DGCommLayout({ children }) {
  return <CommercialLayout nav={NAV} title="DG — Commercial" color="blue">{children}</CommercialLayout>
}
