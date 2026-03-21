import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Menu, X, BarChart3, LogOut } from 'lucide-react'

const NAV = [
  { path: '/besoins/analyse', label: 'Analyse des besoins', icon: BarChart3, exact: true },
]

export default function AnalyseLayout({ children }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const handleSignOut = async () => { await signOut(); navigate('/login') }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">
      {/* Mobile header — affiche le titre + hamburger */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 size={18} className="text-blue-400 shrink-0" />
          <div className="min-w-0">
            <span className="font-bold text-sm block truncate">Analyse des besoins</span>
            <span className="text-[10px] text-slate-400 block truncate">{profile?.prenom} {profile?.nom}</span>
          </div>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1.5 hover:bg-slate-800 rounded-lg shrink-0">
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:sticky md:top-0 md:h-screen md:translate-x-0 md:flex shrink-0
      `}>
        <div className="p-6 border-b border-slate-800 hidden md:block">
          <p className="font-bold text-lg tracking-tight">MonPleinGaz</p>
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Analyse Besoins</p>
        </div>

        {/* Titre mobile dans la sidebar ouverte */}
        <div className="p-4 border-b border-slate-800 md:hidden">
          <p className="font-bold text-sm">MonPleinGaz</p>
          <p className="text-[10px] text-slate-400 uppercase">Analyse Besoins</p>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV.map(({ path, label, icon: Icon, exact }) => {
            const active = exact ? location.pathname === path : location.pathname.startsWith(path)
            return (
              <Link key={path} to={path} onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'
                }`}>
                <Icon size={18} /> {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium text-white truncate">{profile?.prenom} {profile?.nom}</p>
            <p className="text-[10px] text-slate-400 uppercase font-bold truncate">
              {profile?.departements?.nom ?? 'Analyse'}
            </p>
          </div>
          <button onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full text-xs bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white py-2.5 rounded-lg border border-red-500/20 transition-all">
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Backdrop mobile */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
      )}

      <main className="flex-1 p-4 md:p-8 lg:p-10 w-full max-w-7xl mx-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}