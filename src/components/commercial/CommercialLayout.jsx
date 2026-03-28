import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import NotificationsBell from '@/components/NotificationsBell'
import { Menu, X, LogOut, ArrowLeft } from 'lucide-react'

export default function CommercialLayout({ children, nav }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  return (
    <div className="min-h-screen flex bg-gray-100 flex-col md:flex-row">
      <div className="md:hidden bg-orange-900 text-white p-4 flex justify-between items-center sticky top-0 z-50">
        <span className="font-bold">PLeingaz — Commercial</span>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <button onClick={() => setOpen(!open)}>{open ? <X size={24} /> : <Menu size={24} />}</button>
        </div>
      </div>

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-orange-900 text-white transform transition-transform duration-300
        md:relative md:translate-x-0 flex flex-col h-screen shrink-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-orange-800 hidden md:block">
          <p className="font-bold text-lg text-orange-300">PLeingaz</p>
          <p className="text-xs text-orange-400 uppercase tracking-wider">Module Commercial</p>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {nav.map(({ path, label, icon: Icon, exact }) => {
            const active = exact ? location.pathname === path : location.pathname.startsWith(path)
            return (
              <Link key={path} to={path} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  active ? 'bg-orange-700 text-white border-r-4 border-orange-300' : 'text-orange-300 hover:bg-orange-800 hover:text-white'
                }`}>{Icon && <Icon size={18} />} {label}</Link>
            )
          })}
          <div className="border-t border-orange-800 mt-4 pt-4">
            <Link to="/dashboard" className="flex items-center gap-3 px-6 py-3 text-sm text-orange-400 hover:bg-orange-800 hover:text-white">
              <ArrowLeft size={18} /> Retour portail
            </Link>
          </div>
        </nav>
        <div className="p-4 border-t border-orange-800 sticky bottom-0">
          <div className="px-2 mb-4">
            <p className="text-sm font-medium text-white truncate">{profile?.prenom} {profile?.nom}</p>
            <p className="text-xs text-orange-400 truncate">{profile?.email}</p>
          </div>
          <button onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white py-2.5 rounded-lg text-sm font-bold border border-red-600/20">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setOpen(false)} />}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="hidden md:flex justify-end mb-4"><NotificationsBell /></div>
          {children}
        </div>
      </main>
    </div>
  )
}
