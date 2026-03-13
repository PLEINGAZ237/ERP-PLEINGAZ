import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const MODULE_CODE = 'besoins'

// Priorité de redirection par rôle dans le module "besoins"
const ROLE_REDIRECT = [
  { role: 'admin_besoins', path: '/besoins/admin' },
  { role: 'valide_dg',     path: '/besoins/dg' },
  { role: 'valide_dfc',    path: '/besoins/dfc' },
  { role: 'caissiere',     path: '/besoins/caissiere' },
  { role: 'justif',        path: '/besoins/justif' },
  { role: 'emet_besoin',   path: '/besoins/employe' },
]

export default function BesoinsDashboard() {
  const { hasRole, getModuleRoles, serviceRolesLoaded } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Ne pas décider tant que les rôles service ne sont pas chargés
    if (!serviceRolesLoaded) return

    // Admin global → admin besoins
    if (hasRole('Admin')) {
      navigate('/besoins/admin', { replace: true })
      return
    }

    // Rôles via service dans le module besoins
    const moduleRoles = getModuleRoles(MODULE_CODE)

    if (moduleRoles.length === 0) {
      // Pas d'accès au module besoins → retour portail
      navigate('/dashboard', { replace: true })
      return
    }

    // Rediriger vers le dashboard correspondant au rôle le plus prioritaire
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
        <div
          className="w-8 h-8 rounded-full animate-spin"
          style={{ border: '3px solid #e5e7eb', borderTopColor: '#3b82f6' }}
        />
        <p className="text-sm text-gray-400">Redirection en cours...</p>
      </div>
    </div>
  )
}