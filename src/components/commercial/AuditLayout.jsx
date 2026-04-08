import CommercialLayout from '@/components/commercial/CommercialLayout'
import { LayoutDashboard, AlertTriangle, ClipboardList, History, Wallet, Package, BarChart3, Gift } from 'lucide-react'

const NAV = [
  { path: '/commercial/audit', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/commercial/audit/ecarts', label: 'Écarts à valider', icon: AlertTriangle },
  { path: '/commercial/audit/publicites', label: 'Ordres de publicité', icon: Gift },
  { path: '/commercial/audit/analyses', label: 'Analyses ventes', icon: BarChart3 },
  { path: '/commercial/audit/inventaires', label: 'Inventaires', icon: ClipboardList },
  { path: '/commercial/audit/rapports-caisse', label: 'Rapports caisse', icon: Wallet },
  { path: '/commercial/audit/rapports-stock', label: 'Rapports stock', icon: Package },
  { path: '/commercial/audit/journal', label: 'Journal d\'audit', icon: History },
]

export default function AuditLayout({ children }) {
  return <CommercialLayout nav={NAV} title="Audit & Contrôle" color="purple">{children}</CommercialLayout>
}
