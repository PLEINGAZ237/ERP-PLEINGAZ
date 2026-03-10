import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

// Priorité de redirection par rôle — TOUTES les routes sont préfixées /besoins/
const ROLE_REDIRECT = [
  { role: 'Admin',     path: '/besoins/admin' },
  { role: 'DG',        path: '/besoins/dg' },
  { role: 'DFC',       path: '/besoins/dfc' },
  { role: 'Caissiere', path: '/besoins/caissiere' },
  { role: 'Justif',    path: '/besoins/justif' },
  { role: 'Employe',   path: '/besoins/employe' },
]

export default function BesoinsDashboard() {
  const { roles } = useAuth()
  const navigate  = useNavigate()

  useEffect(() => {
    if (roles.length === 0) return
    const match = ROLE_REDIRECT.find(r => roles.includes(r.role))
    if (match) navigate(match.path, { replace: true })
    // Si aucun rôle ne correspond → retour au portail
    else navigate('/dashboard', { replace: true })
  }, [roles, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400">Redirection en cours...</p>
    </div>
  )
}