import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import NotificationsBell from '@/components/NotificationsBell'
import { Menu, X, LogOut, ArrowLeft, Flame } from 'lucide-react'

export default function CommercialLayout({ children, nav, title = 'Commercial', color = 'red' }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  return (
    <div className="min-h-screen flex bg-white flex-col md:flex-row">
      {/* Mobile header */}
      <div className="md:hidden bg-red-700 text-white p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Flame size={20} className="text-red-200" />
          <span className="font-bold text-sm tracking-wide">PLeingaz</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsBell />
          <button onClick={() => setOpen(!open)} className="p-1 rounded-lg hover:bg-red-600 transition-colors">{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-[250px] bg-red-700 text-white transform transition-transform duration-300
        md:relative md:translate-x-0 flex flex-col h-screen shrink-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Logo */}
        <div className="p-5 hidden md:block">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Flame size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-base tracking-wide text-white">PLeingaz</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-red-200">{title}</p>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="mx-4 h-px bg-red-600" />

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto px-3">
          {nav.map(({ path, label, icon: Icon, exact }) => {
            const active = exact ? location.pathname === path : (path === nav[0]?.path ? location.pathname === path : location.pathname.startsWith(path))
            return (
              <Link key={path} to={path} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-[13px] rounded-lg mb-0.5 transition-all ${
                  active
                    ? 'bg-white text-red-700 font-semibold shadow-sm'
                    : 'text-red-100 hover:bg-red-600 hover:text-white'
                }`}>
                {Icon && <Icon size={17} strokeWidth={active ? 2.2 : 1.5} />}
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Separator */}
        <div className="mx-4 h-px bg-red-600" />

        {/* Back to portal */}
        <div className="px-3 py-2">
          <Link to="/dashboard" onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 text-[13px] text-red-200 hover:text-white rounded-lg hover:bg-red-600 transition-all">
            <ArrowLeft size={17} strokeWidth={1.5} /> Retour portail
          </Link>
        </div>

        {/* User */}
        <div className="p-4">
          <div className="bg-red-800 rounded-xl p-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm font-bold text-white">
                {(profile?.prenom?.[0] ?? '').toUpperCase()}{(profile?.nom?.[0] ?? '').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{profile?.prenom} {profile?.nom}</p>
                <p className="text-[11px] text-red-300 truncate">{profile?.email}</p>
              </div>
            </div>
            <button onClick={handleSignOut}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-[12px] font-medium text-red-200 hover:text-white hover:bg-red-700 transition-all border border-red-600">
              <LogOut size={13} /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {open && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setOpen(false)} />}

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="hidden md:flex justify-end mb-4">
            <NotificationsBell />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
