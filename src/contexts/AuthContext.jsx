import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [profile, setProfile]         = useState(null)
  const [roles, setRoles]             = useState([])          // rôles directs (utilisateur_roles) — ex: ['Admin']
  const [serviceRoles, setServiceRoles] = useState([])        // rôles via service — ex: [{module_code:'besoins', role_nom:'emet_besoin'}, ...]
  const [loading, setLoading]         = useState(true)

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*, entreprises(nom), departements(nom), services(nom)')
      .eq('id', userId)
      .single()
    setProfile(data)

    // Si l'utilisateur a un service, charger ses rôles par module
    if (data?.service_id) {
      await fetchServiceRoles(data.service_id)
    } else {
      setServiceRoles([])
    }
  }

  const fetchRoles = async (userId) => {
    const { data } = await supabase
      .from('utilisateur_roles')
      .select('roles(nom)')
      .eq('user_id', userId)
    const noms = data?.map(r => r.roles.nom) ?? []
    setRoles(noms)
  }

  const fetchServiceRoles = async (serviceId) => {
    const { data } = await supabase
      .from('service_role_module')
      .select('roles(nom), modules(code, nom)')
      .eq('service_id', serviceId)

    const mapped = (data ?? []).map(row => ({
      role_nom: row.roles?.nom,
      module_code: row.modules?.code,
      module_nom: row.modules?.nom,
    })).filter(r => r.role_nom && r.module_code)

    setServiceRoles(mapped)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        fetchRoles(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id)
          fetchRoles(session.user.id)
        } else {
          setProfile(null)
          setRoles([])
          setServiceRoles([])
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setRoles([])
    setServiceRoles([])
  }

  // ── Helpers rôles directs (utilisateur_roles) ──
  const hasRole = (roleName) => roles.includes(roleName)
  const hasAnyRole = (roleNames) => roleNames.some(r => roles.includes(r))

  // ── Helpers rôles via service (service_role_module) ──
  // L'utilisateur a-t-il accès à un module donné ?
  const hasModuleAccess = (moduleCode) =>
    serviceRoles.some(sr => sr.module_code === moduleCode)

  // L'utilisateur a-t-il un rôle précis dans un module ?
  const hasModuleRole = (moduleCode, roleName) =>
    serviceRoles.some(sr => sr.module_code === moduleCode && sr.role_nom === roleName)

  // L'utilisateur a-t-il au moins un des rôles listés dans un module ?
  const hasAnyModuleRole = (moduleCode, roleNames) =>
    roleNames.some(r => serviceRoles.some(sr => sr.module_code === moduleCode && sr.role_nom === r))

  // Récupérer tous les rôles de l'utilisateur dans un module
  const getModuleRoles = (moduleCode) =>
    serviceRoles.filter(sr => sr.module_code === moduleCode).map(sr => sr.role_nom)

  // Récupérer tous les modules auxquels l'utilisateur a accès
  const getAccessibleModules = () => {
    const unique = new Map()
    serviceRoles.forEach(sr => {
      if (!unique.has(sr.module_code)) {
        unique.set(sr.module_code, { code: sr.module_code, nom: sr.module_nom })
      }
    })
    return Array.from(unique.values())
  }

  return (
    <AuthContext.Provider value={{
      user, profile, roles, serviceRoles, loading,
      signIn, signOut, fetchProfile,
      hasRole, hasAnyRole,
      hasModuleAccess, hasModuleRole, hasAnyModuleRole,
      getModuleRoles, getAccessibleModules,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)