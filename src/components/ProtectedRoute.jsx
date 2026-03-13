import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Props :
 * - onboardingOnly : vérifie juste l'auth (pour /changer-mot-de-passe, /completer-profil)
 * - roles          : rôles directs via utilisateur_roles (ex: ['Admin'])
 * - module         : code du module requis (ex: 'besoins')
 * - moduleRoles    : rôles acceptés dans ce module (ex: ['emet_besoin','valide_dfc'])
 *
 * Logique :
 * - Si `roles` est défini → vérifie via utilisateur_roles (rôles directs comme Admin)
 * - Si `module` + `moduleRoles` sont définis → vérifie via service_role_module
 * - Les deux peuvent être combinés (Admin OU rôle via service)
 */
export default function ProtectedRoute({
  children,
  roles,
  module: moduleCode,
  moduleRoles,
  onboardingOnly = false,
}) {
  const { user, profile, hasAnyRole, hasAnyModuleRole } = useAuth()
  const location = useLocation()

  // 1. Pas connecté
  if (!user)
    return <Navigate to="/login" replace />

  // 2. Profil pas encore chargé
  if (!profile)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full animate-spin"
            style={{ border: '3px solid #e5e7eb', borderTopColor: '#ef4444' }}
          />
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      </div>
    )

  // 3. Pages d'onboarding → juste l'auth
  if (onboardingOnly)
    return children

  // 4. Onboarding non terminé
  if (profile.mot_de_passe_change === false && location.pathname !== '/changer-mot-de-passe')
    return <Navigate to="/changer-mot-de-passe" replace />

  if (profile.profil_complete === false && location.pathname !== '/completer-profil')
    return <Navigate to="/completer-profil" replace />

  // 5. Vérification des droits d'accès
  if (roles || (moduleCode && moduleRoles)) {
    const hasDirectRole = roles ? hasAnyRole(roles) : false
    const hasServiceRole = (moduleCode && moduleRoles)
      ? hasAnyModuleRole(moduleCode, moduleRoles)
      : false

    // L'un OU l'autre suffit (ex: Admin direct OU rôle via service)
    if (!hasDirectRole && !hasServiceRole)
      return <Navigate to="/dashboard" replace />
  }

  return children
}