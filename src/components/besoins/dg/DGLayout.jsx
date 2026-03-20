import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Menu, X, LayoutDashboard, BarChart3, LogOut } from 'lucide-react'

const NAV = [
  { path: '/besoins/dg', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { path: '/besoins/dg/analyse', label: 'Analyse & Contrôles', icon: BarChart3 },
]

export default function DGLayout({ children }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const handleSignOut = async () => { await signOut(); navigate('/login') }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">
      {/* Header Mobile */}
      <div className="md:hidden bg-red-900 text-white p-4 flex justify-between items-center sticky top-0 z-50">
        <span className="font-bold tracking-tight">MonPleinGaz</span>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-red-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:sticky md:top-0 md:h-screen md:translate-x-0 md:flex shrink-0
      `}>
        <div className="p-6 border-b border-red-800 hidden md:block">
          <p className="font-bold text-lg tracking-tight">MonPleinGaz</p>
          <p className="text-xs text-red-300 uppercase tracking-widest mt-1">Espace DG</p>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV.map(({ path, label, icon: Icon, exact }) => {
            const active = exact
              ? location.pathname === path
              : location.pathname.startsWith(path)
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  active ? 'bg-red-700 text-white shadow-lg' : 'text-red-200 hover:bg-red-800'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-red-800 bg-red-950/50">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium text-white truncate">{profile?.prenom} {profile?.nom}</p>
            <p className="text-[10px] text-red-400 uppercase font-bold truncate">
              Directeur Général
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full text-xs bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-lg border border-white/20 transition-all"
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </aside>

      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
      )}

      <main className="flex-1 p-4 md:p-8 lg:p-10 w-full max-w-7xl mx-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}