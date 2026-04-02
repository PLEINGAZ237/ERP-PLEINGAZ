import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const MODULE_CODE = 'commercial'

const ROLE_REDIRECT = [
  { role: 'DG',          path: '/commercial/dg' },
  { role: 'AUDIT',       path: '/commercial/audit' },
  { role: 'DFC',         path: '/commercial/dex' },
  { role: 'COMPTABLE',   path: '/commercial/comptable' },
  { role: 'RESP_AGENCE', path: '/commercial/agence' },
  { role: 'COMM',        path: '/commercial/comm' },
  { role: 'VENTE',       path: '/commercial/vente' },
  { role: 'CAISSE',      path: '/commercial/caisse' },
  { role: 'MAGASIN',     path: '/commercial/magasin' },
]

export default function CommercialDashboard() {
  const { hasRole, getModuleRoles, serviceRolesLoaded } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!serviceRolesLoaded) return

    if (hasRole('Admin')) {
      navigate('/commercial/comm', { replace: true })
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
  }, [serviceRolesLoaded])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid #e5e7eb', borderTopColor: '#ea580c' }} />
        <p className="text-sm text-gray-400">Redirection en cours...</p>
      </div>
    </div>
  )
}
