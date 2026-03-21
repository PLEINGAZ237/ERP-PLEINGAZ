import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const MODULE_CODE = 'besoins'

// Priorité de redirection — noms EXACTS de la table `roles` en base
const ROLE_REDIRECT = [
  { role: 'DG',              path: '/besoins/dg' },
  { role: 'analyse_besoin',  path: '/besoins/analyse' },
  { role: 'DFC',             path: '/besoins/dfc' },
  { role: 'decaissement',    path: '/besoins/caissiere' },
  { role: 'Justif',          path: '/besoins/justif' },
  { role: 'emet_besoin',     path: '/besoins/employe' },
]

export default function BesoinsDashboard() {
  const { hasRole, getModuleRoles, serviceRolesLoaded } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!serviceRolesLoaded) return

    // Admin global → admin besoins
    if (hasRole('Admin')) {
      navigate('/besoins/admin', { replace: true })
      return
    }

    const moduleRoles = getModuleRoles(MODULE_CODE)

    if (moduleRoles.length === 0) {
      navigate('/dashboard', { replace: true })
      return
    }

    const match = ROLE_REDIRECT.find(r => moduleRoles.includes(r.role))
    if (match) {
      navigate(match.path, { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }, [serviceRolesLoaded, hasRole, getModuleRoles, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid #e5e7eb', borderTopColor: '#3b82f6' }} />
        <p className="text-sm text-gray-400">Redirection en cours...</p>
      </div>
    </div>
  )
}