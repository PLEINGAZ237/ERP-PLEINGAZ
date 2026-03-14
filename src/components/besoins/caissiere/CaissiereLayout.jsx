import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Menu, X, LayoutDashboard, LogOut } from 'lucide-react'

const NAV = [
  {
    path: '/besoins/caissiere',
    label: 'Décaissements à effectuer',
    icon: <LayoutDashboard size={18} />,
    exact: true,
  },
]

export default function CaissiereLayout({ children }) {
  const { profile, signOut } = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  // Nom de la caisse du responsable connecté
  const nomCaisse = profile?.caisses?.nom ?? 'Caisse'

  return (
    <div className='min-h-screen flex flex-col md:flex-row bg-gray-100'>

      {/* Topbar mobile */}
      <div className='md:hidden bg-teal-900 text-white p-4 flex justify-between items-center sticky top-0 z-50'>
        <span className='font-bold tracking-tight'>MonPleinGaz</span>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className='p-1'>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-teal-900 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:sticky md:top-0 md:h-screen md:translate-x-0 md:flex shrink-0
      `}>
        <div className='p-6 border-b border-teal-800 hidden md:block'>
          <p className='font-bold text-lg tracking-tight'>MonPleinGaz</p>
          <p className='text-xs text-teal-300 uppercase tracking-widest mt-1'>
            Caisse {nomCaisse}
          </p>
        </div>

        <div className='h-16 md:hidden shrink-0' />

        <nav className='flex-1 py-2 px-3 space-y-1 overflow-y-auto'>
          {NAV.map(({ path, label, icon, exact }) => {
            const active = exact
              ? location.pathname === path
              : location.pathname.startsWith(path)
            return (
              <Link key={path} to={path} onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  active ? 'bg-teal-700 text-white shadow-lg' : 'text-teal-200 hover:bg-teal-800'
                }`}
              >
                {icon}{label}
              </Link>
            )
          })}
        </nav>

        <div className='p-4 border-t border-teal-800 bg-teal-950/50'>
          <div className='mb-4 px-2 space-y-1'>
            <p className='text-sm font-bold text-white truncate'>{profile?.prenom} {profile?.nom}</p>
            <p className='text-xs text-teal-300 font-semibold truncate'>{profile?.entreprises?.nom ?? '—'}</p>
            <p className='text-xs text-teal-400 truncate'>{profile?.departements?.nom ?? '—'}</p>
            {profile?.services?.nom && (
              <p className='text-xs text-white/80 truncate'>
                Responsable <span className='font-bold text-white'>{profile.services.nom}</span>
              </p>
            )}
          </div>
          <button onClick={handleSignOut}
            className='flex items-center justify-center gap-2 w-full text-xs bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white py-2.5 rounded-lg border border-red-500/20 transition-all'>
            <LogOut size={14} />Déconnexion
          </button>
        </div>
      </aside>

      {isMenuOpen && (
        <div className='fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm'
          onClick={() => setIsMenuOpen(false)} />
      )}

      <main className='flex-1 p-4 md:p-8 lg:p-10 w-full max-w-7xl mx-auto overflow-x-hidden'>
        {children}
      </main>
    </div>
  )
}