import AdminLayout from '@/components/admin/AdminLayout'
import { Link } from 'react-router-dom'
import {
  Building2,
  List,
  CreditCard,
  Landmark,
  Warehouse, // Corrigé : majuscule ici
  Fuel,
  Users,
  Settings,
} from 'lucide-react'

const CARDS = [
  {
    label: 'Entreprises',
    path: '/admin/entreprises',
    icon: Building2,
    color: 'text-blue-600',
  },
  {
    label: 'Départements',
    path: '/admin/departements',
    icon: List,
    color: 'text-purple-600',
  },
  {
    label: 'Caisses',
    path: '/admin/caisses',
    icon: CreditCard,
    color: 'text-green-600',
  },
  {
    label: 'Agences',
    path: '/admin/agences',
    icon: Building2,
    color: 'text-orange-600',
  },
  {
    label: 'Magasins',
    path: '/admin/magasins',
    icon: Warehouse, // Corrigé : majuscule ici
    color: 'text-teal-600',
  },
  {
    label: 'Citernes',
    path: '/admin/citernes',
    icon: Fuel,
    color: 'text-red-600',
  },
  {
    label: 'Banques',
    path: '/admin/banques',
    icon: Landmark,
    color: 'text-indigo-600',
  },
  {
    label: 'Utilisateurs',
    path: '/admin/utilisateurs',
    icon: Users,
    color: 'text-pink-600',
  },
  {
    label: 'Rôles',
    path: '/admin/roles',
    icon: Settings,
    color: 'text-gray-600',
  },
]

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className='mb-8'>
        <h1 className='text-2xl md:text-3xl font-bold text-gray-900'>
          Tableau de bord
        </h1>
        <p className='text-gray-500'>
          Bienvenue dans votre espace d'administration.
        </p>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
        {CARDS.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.path}
              to={card.path}
              className='group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-500/50 transition-all flex items-start gap-4'
            >
              <div
                className={`p-3 rounded-xl bg-gray-50 group-hover:bg-blue-50 transition-colors ${card.color}`}
              >
                <Icon size={24} />
              </div>
              <div>
                <p className='font-bold text-gray-800 group-hover:text-blue-600 transition-colors'>
                  {card.label}
                </p>
                <p className='text-xs text-gray-400 mt-1'>
                  Gérer les {card.label.toLowerCase()}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </AdminLayout>
  )
}
