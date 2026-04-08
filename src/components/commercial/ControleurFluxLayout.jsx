import CommercialLayout from '@/components/commercial/CommercialLayout'
import { LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

const NAV = [
  { path: '/commercial/controleur', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/commercial/controleur/entrees', label: 'Validations entrées', icon: ArrowDownToLine },
  { path: '/commercial/controleur/sorties', label: 'Validations sorties', icon: ArrowUpFromLine },
  { path: '/commercial/controleur/stock', label: 'Stock magasin', icon: Package },
]

export default function ControleurFluxLayout({ children }) {
  return <CommercialLayout nav={NAV} title="Contrôleur Flux" color="rose">{children}</CommercialLayout>
}
