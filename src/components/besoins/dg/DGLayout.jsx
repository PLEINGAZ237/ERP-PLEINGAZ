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
      
      {/* Mobile header */}
      <div className="md:hidden bg-red-900 text-white p-4 flex justify-between items-center sticky top-0 z-40 shadow-md">
        <span className="font-bold tracking-tight">MonPleinGaz</span>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 active:bg-red-800 rounded">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-100 w-72 bg-red-900 text-white flex flex-col transform transition-transform duration-300 e-in-out shadow-2xl
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:sticky md:top-0 md:h-screen md:translate-x-0 md:flex md:w-64 shrink-0
      `}>
        <div className="p-6 border-b border-red-700 block">
          <div className="flex justify-between items-center md:block">
            <div>
              <p className="font-bold text-xl tracking-tight">PLEINGAZ</p>
              <p className="text-xs text-red-400 uppercase font-black tracking-widest mt-1">Espace DG</p>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="md:hidden p-2 text-red-200">
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2">
          {NAV.map(({ path, label, icon: Icon, exact }) => {
            const active = exact
              ? location.pathname === path
              : location.pathname.startsWith(path)

            return (
              <Link
                key={path}
                to={path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                  active 
                    ? 'bg-red-600 text-white shadow-lg' 
                    : 'text-red-100 hover:bg-red-800/50'
                }`}
              >
                <Icon size={20} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-red-800 bg-red-950/40">
          <div className="mb-4 px-2">
            <p className="text-sm font-bold text-white truncate">{profile?.prenom} {profile?.nom}</p>
            <p className="text-[10px] text-red-400 uppercase font-black truncate tracking-tighter">Directeur Général</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full text-xs bg-white/10 hover:bg-red-600 text-red-100 py-3 rounded-lg border border-white/10 transition-all font-bold"
          >
            <LogOut size={14} /> DÉCONNEXION
          </button>
        </div>
      </aside>

      {/* Backdrop mobile */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-90 md:hidden backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* Main content area */}
      <main className="flex-1 bg-gray-100 min-h-screen">
        <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}