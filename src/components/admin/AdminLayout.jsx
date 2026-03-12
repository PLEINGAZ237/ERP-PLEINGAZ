import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Landmark,
  Warehouse,
  Fuel,
  List,
  Network,
  Box,
} from 'lucide-react'

const NAV = [
  {
    path: '/admin',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    exact: true,
  },
  { path: '/admin/entreprises', label: 'Entreprises', icon: Building2 },
  { path: '/admin/departements', label: 'Départements', icon: List },
  { path: '/admin/services', label: 'Services', icon: Network },
  { path: '/admin/modules', label: 'Modules', icon: Box },
  { path: '/admin/caisses', label: 'Caisses', icon: CreditCard },
  { path: '/admin/agences', label: 'Agences', icon: Building2 },
  { path: '/admin/magasins', label: 'Magasins', icon: Warehouse },
  { path: '/admin/citernes', label: 'Citernes', icon: Fuel },
  { path: '/admin/banques', label: 'Banques', icon: Landmark },
  { path: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
]

export default function AdminLayout({ children }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className='min-h-screen flex bg-gray-100 flex-col md:flex-row'>
      {/* Header Mobile */}
      <div className='md:hidden bg-gray-900 text-white p-4 flex justify-between items-center sticky top-0 z-50'>
        <span className='font-bold'>MonPleinGaz</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 flex flex-col h-screen shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <div className='p-6 border-b border-gray-800 hidden md:block'>
          <p className='font-bold text-lg text-blue-400'>MonPleinGaz</p>
          <p className='text-xs text-gray-400 uppercase tracking-wider'>
            Administration
          </p>
        </div>

        {/* Zone de navigation scrollable */}
        <nav className='flex-1 py-4 overflow-y-auto'>
          {NAV.map(({ path, label, exact, icon: Icon }) => {
            const active = exact
              ? location.pathname === path
              : location.pathname.startsWith(path) && path !== '/admin'
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  active
                    ? 'bg-blue-600 text-white border-r-4 border-blue-300'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {Icon && <Icon size={18} />}
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer Sidebar Fixe */}
        <div className='p-4 border-t border-gray-800 bg-gray-900 sticky bottom-0'>
          <div className='px-2 mb-4'>
            <p className='text-sm font-medium text-white truncate'>
              {profile?.prenom} {profile?.nom}
            </p>
            <p className='text-xs text-gray-500 truncate'>{profile?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className='flex items-center justify-center gap-2 w-full bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white py-2.5 rounded-lg transition-all text-sm font-bold border border-red-600/20'
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Overlay Mobile */}
      {isMobileMenuOpen && (
        <div
          className='fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden'
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className='flex-1 p-4 md:p-8 overflow-x-hidden'>
        <div className='max-w-7xl mx-auto'>{children}</div>
      </main>
    </div>
  )
}