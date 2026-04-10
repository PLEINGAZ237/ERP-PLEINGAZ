import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import NotificationsBell from '@/components/NotificationsBell'
import { Menu, X, LogOut, ArrowLeft, Flame } from 'lucide-react'

export default function CommercialLayout({ children, nav, title = 'Commercial', color = 'orange' }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const COLORS = {
    orange: { bg: 'from-[#1a0f00] to-[#2d1800]', active: 'bg-gradient-to-r from-orange-600/30 to-orange-600/10', border: 'border-orange-400', accent: 'text-orange-400', hover: 'hover:bg-white/5', header: 'text-orange-300', sub: 'text-orange-400/70', dot: 'bg-orange-400' },
    blue: { bg: 'from-[#0a0f1a] to-[#0d1a2d]', active: 'bg-gradient-to-r from-blue-600/30 to-blue-600/10', border: 'border-blue-400', accent: 'text-blue-400', hover: 'hover:bg-white/5', header: 'text-blue-300', sub: 'text-blue-400/70', dot: 'bg-blue-400' },
    teal: { bg: 'from-[#0a1a17] to-[#0d2d24]', active: 'bg-gradient-to-r from-teal-600/30 to-teal-600/10', border: 'border-teal-400', accent: 'text-teal-400', hover: 'hover:bg-white/5', header: 'text-teal-300', sub: 'text-teal-400/70', dot: 'bg-teal-400' },
    purple: { bg: 'from-[#120a1a] to-[#1d0d2d]', active: 'bg-gradient-to-r from-purple-600/30 to-purple-600/10', border: 'border-purple-400', accent: 'text-purple-400', hover: 'hover:bg-white/5', header: 'text-purple-300', sub: 'text-purple-400/70', dot: 'bg-purple-400' },
    green: { bg: 'from-[#0a1a0f] to-[#0d2d18]', active: 'bg-gradient-to-r from-green-600/30 to-green-600/10', border: 'border-green-400', accent: 'text-green-400', hover: 'hover:bg-white/5', header: 'text-green-300', sub: 'text-green-400/70', dot: 'bg-green-400' },
    amber: { bg: 'from-[#1a150a] to-[#2d220d]', active: 'bg-gradient-to-r from-amber-600/30 to-amber-600/10', border: 'border-amber-400', accent: 'text-amber-400', hover: 'hover:bg-white/5', header: 'text-amber-300', sub: 'text-amber-400/70', dot: 'bg-amber-400' },
    indigo: { bg: 'from-[#0a0a1a] to-[#0d0d2d]', active: 'bg-gradient-to-r from-indigo-600/30 to-indigo-600/10', border: 'border-indigo-400', accent: 'text-indigo-400', hover: 'hover:bg-white/5', header: 'text-indigo-300', sub: 'text-indigo-400/70', dot: 'bg-indigo-400' },
    cyan: { bg: 'from-[#0a1519] to-[#0d2228]', active: 'bg-gradient-to-r from-cyan-600/30 to-cyan-600/10', border: 'border-cyan-400', accent: 'text-cyan-400', hover: 'hover:bg-white/5', header: 'text-cyan-300', sub: 'text-cyan-400/70', dot: 'bg-cyan-400' },
    rose: { bg: 'from-[#1a0a10] to-[#2d0d1a]', active: 'bg-gradient-to-r from-rose-600/30 to-rose-600/10', border: 'border-rose-400', accent: 'text-rose-400', hover: 'hover:bg-white/5', header: 'text-rose-300', sub: 'text-rose-400/70', dot: 'bg-rose-400' },
  }
  const c = COLORS[color] || COLORS.orange

  return (
    <div className="min-h-screen flex bg-[#f8f9fc] flex-col md:flex-row">
      {/* Mobile header */}
      <div className={`md:hidden bg-gradient-to-r ${c.bg} text-white p-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-xl`}>
        <div className="flex items-center gap-2">
          <Flame size={20} className={c.accent} />
          <span className="font-bold text-sm tracking-wide">PLeingaz</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsBell />
          <button onClick={() => setOpen(!open)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-gradient-to-b ${c.bg} text-white transform transition-all duration-300 ease-out
        md:relative md:translate-x-0 flex flex-col h-screen shrink-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backdropFilter: 'blur(20px)' }}>

        {/* Logo */}
        <div className="p-6 hidden md:block">
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20`}>
              <Flame size={16} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-base tracking-wide text-white">PLeingaz</p>
              <p className={`text-[10px] uppercase tracking-[0.2em] ${c.sub}`}>{title}</p>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto px-3">
          {nav.map(({ path, label, icon: Icon, exact }) => {
            const active = exact ? location.pathname === path : (path === nav[0]?.path ? location.pathname === path : location.pathname.startsWith(path))
            return (
              <Link key={path} to={path} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-[13px] rounded-xl mb-0.5 transition-all duration-200 ${
                  active
                    ? `${c.active} text-white ${c.border} border-l-[3px] font-semibold shadow-sm`
                    : `text-white/50 ${c.hover} hover:text-white/90 border-l-[3px] border-transparent`
                }`}>
                {Icon && <Icon size={17} strokeWidth={active ? 2.2 : 1.5} />}
                <span>{label}</span>
                {active && <div className={`w-1.5 h-1.5 rounded-full ${c.dot} ml-auto animate-pulse`} />}
              </Link>
            )
          })}
        </nav>

        {/* Separator */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Back to portal */}
        <div className="px-3 py-2">
          <Link to="/dashboard" onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/40 hover:text-white/80 rounded-xl hover:bg-white/5 transition-all">
            <ArrowLeft size={17} strokeWidth={1.5} /> Retour portail
          </Link>
        </div>

        {/* User */}
        <div className="p-4">
          <div className="bg-white/5 rounded-2xl p-3 backdrop-blur-sm border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-sm font-bold text-white/80 border border-white/10">
                {(profile?.prenom?.[0] ?? '').toUpperCase()}{(profile?.nom?.[0] ?? '').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90 truncate">{profile?.prenom} {profile?.nom}</p>
                <p className="text-[11px] text-white/30 truncate">{profile?.email}</p>
              </div>
            </div>
            <button onClick={handleSignOut}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[12px] font-medium text-red-400/80 hover:text-white hover:bg-red-500/20 transition-all duration-200 border border-red-500/10 hover:border-red-500/30">
              <LogOut size={13} /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {open && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden" onClick={() => setOpen(false)} />}

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="hidden md:flex justify-end mb-6">
            <NotificationsBell />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
