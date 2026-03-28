import CommercialLayout from '@/components/commercial/CommercialLayout'
import { LayoutDashboard, ShoppingCart, FileText, Truck, List, CheckSquare, RotateCcw } from 'lucide-react'

const NAV = [
  { path: '/commercial/agence', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/commercial/agence/commandes', label: 'Commandes', icon: ShoppingCart },
  { path: '/commercial/agence/factures', label: 'Factures', icon: FileText },
  { path: '/commercial/agence/sorties', label: 'Sorties véhicules', icon: Truck },
  { path: '/commercial/agence/retours', label: 'Retours produits', icon: RotateCcw },
  { path: '/commercial/agence/validations', label: 'Validations', icon: CheckSquare },
  { path: '/commercial/agence/clients', label: 'Clients', icon: List },
]

export default function RespAgenceLayout({ children }) {
  return <CommercialLayout nav={NAV} title="Responsable Agence" color="teal">{children}</CommercialLayout>
}
