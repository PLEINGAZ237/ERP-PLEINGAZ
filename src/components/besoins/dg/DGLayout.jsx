import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const NAV = [
  { path: '/besoins/dg', label: 'Tableau de bord', exact: true },
  { path: '/besoins/dg/analyse', label: 'Analyse besoins' },
]

export default function DGLayout({ children }) {
  const { profile, roles, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const handleSignOut = async () => { await signOut(); navigate('/login') }

  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-60 bg-emerald-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-emerald-800">
          <p className="font-bold text-sm">MonPleinGaz</p>
          <p className="text-xs text-emerald-300 mt-1">Espace DG</p>
        </div>
        <nav className="flex-1 py-2">
          {NAV.map(({ path, label, exact }) => {
            const active = exact
              ? location.pathname === path
              : location.pathname.startsWith(path)
            return (
              <Link
                key={path}
                to={path}
                className={`block px-4 py-2.5 text-sm transition-colors ${
                  active ? 'bg-emerald-700 text-white' : 'text-emerald-200 hover:bg-emerald-800'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-emerald-800">
          <p className="text-xs text-emerald-300 mb-1 truncate">
            {profile?.prenom} {profile?.nom}
          </p>
          <p className="text-xs text-emerald-400 mb-3">{roles.join(', ')}</p>
          <button
            onClick={handleSignOut}
            className="w-full text-xs bg-emerald-800 hover:bg-emerald-700 text-white py-1.5 rounded"
          >
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}