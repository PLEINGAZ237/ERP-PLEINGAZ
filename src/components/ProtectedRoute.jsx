import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({
  children,
  roles,
  module: moduleCode,
  moduleRoles,
  onboardingOnly = false,
}) {
  const { user, profile, serviceRolesLoaded, hasAnyRole, hasAnyModuleRole } = useAuth()
  const location = useLocation()

  // 1. Pas connecté
  if (!user)
    return <Navigate to="/login" replace />

  // 2. Profil pas encore chargé
  if (!profile)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full animate-spin"
            style={{ border: '3px solid #e5e7eb', borderTopColor: '#ef4444' }} />
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      </div>
    )

  // 3. Onboarding → juste l'auth
  if (onboardingOnly)
    return children

  // 4. Onboarding non terminé
  if (profile.mot_de_passe_change === false && location.pathname !== '/changer-mot-de-passe')
    return <Navigate to="/changer-mot-de-passe" replace />

  if (profile.profil_complete === false && location.pathname !== '/completer-profil')
    return <Navigate to="/completer-profil" replace />

  // 5. Si on doit vérifier des rôles service et qu'ils ne sont pas encore chargés → spinner
  if ((moduleCode && moduleRoles) && !serviceRolesLoaded)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full animate-spin"
            style={{ border: '3px solid #e5e7eb', borderTopColor: '#3b82f6' }} />
          <p className="text-sm text-gray-400">Vérification des accès...</p>
        </div>
      </div>
    )

  // 6. Vérification des droits
  if (roles || (moduleCode && moduleRoles)) {
    const hasDirectRole = roles ? hasAnyRole(roles) : false
    const hasServiceRole = (moduleCode && moduleRoles)
      ? hasAnyModuleRole(moduleCode, moduleRoles)
      : false

    if (!hasDirectRole && !hasServiceRole)
      return <Navigate to="/dashboard" replace />
  }

  return children
}