import { useAuth } from '../contexts/AuthContext'

// Exemple d'usage :
// <RoleGuard roles={['Admin']}>  <-- visible seulement pour Admin
//   <BoutonSuppression />
// </RoleGuard>
//
// <RoleGuard roles={['DFC', 'DG']} fallback={<p>Accès refusé</p>}>
//   <TableauValidation />
// </RoleGuard>

export default function RoleGuard({ roles, children, fallback = null }) {
  const { hasAnyRole } = useAuth()
  return hasAnyRole(roles) ? children : fallback
}
