import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// roles (optionnel) : tableau de rôles autorisés ex: ['Admin'] ou ['DFC','DG']
export default function ProtectedRoute({ children, roles }) {
  const { user, profile, hasAnyRole } = useAuth()

  if (!user)
    return <Navigate to="/login" replace />

  if (profile?.mot_de_passe_change === false)
    return <Navigate to="/changer-mot-de-passe" replace />

  if (profile?.profil_complete === false)
    return <Navigate to="/completer-profil" replace />

  // Si une restriction de rôle est demandée
  if (roles && !hasAnyRole(roles))
    return <Navigate to="/dashboard" replace />

  return children
}
