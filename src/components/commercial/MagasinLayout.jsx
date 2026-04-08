import CommercialLayout from '@/components/commercial/CommercialLayout'
import { LayoutDashboard, Package, ArrowUpFromLine, BookOpen, ClipboardList, Truck } from 'lucide-react'

const NAV = [
  { path: '/commercial/magasin', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/commercial/magasin/gestion', label: 'Gestion stock', icon: BookOpen },
  { path: '/commercial/magasin/stock', label: 'Mon stock', icon: Package },
  { path: '/commercial/magasin/livraisons', label: 'Livraisons', icon: ArrowUpFromLine },
  { path: '/commercial/magasin/retours-vehicules', label: 'Retours véhicules', icon: Truck },
  { path: '/commercial/magasin/mes-rapports', label: 'Mes rapports', icon: ClipboardList, Truck },
]

export default function MagasinLayout({ children }) {
  return <CommercialLayout nav={NAV} title="Magasin" color="green">{children}</CommercialLayout>
}
