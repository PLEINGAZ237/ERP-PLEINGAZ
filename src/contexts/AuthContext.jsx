import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

const eqIgnoreCase = (a, b) =>
  (a ?? '').toLowerCase() === (b ?? '').toLowerCase()

export function AuthProvider({ children }) {
  const [user, setUser]                             = useState(null)
  const [profile, setProfile]                       = useState(null)
  const [roles, setRoles]                           = useState([])
  const [serviceRoles, setServiceRoles]             = useState([])
  const [loading, setLoading]                       = useState(true)
  const [serviceRolesLoaded, setServiceRolesLoaded] = useState(false)
  const initialSessionHandled = useRef(false)

  const fetchServiceRoles = async (serviceId) => {
    if (!serviceId) {
      setServiceRoles([])
      setServiceRolesLoaded(true)
      return
    }
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
    setServiceRolesLoaded(true)
  }

  const fetchProfile = async (userId) => {
    setServiceRolesLoaded(false)
    const { data } = await supabase
      .from('profiles')
      .select('*, entreprises(nom), departements(nom), services(nom), caisses(nom)')
      .eq('id', userId)
      .single()
    setProfile(data)
    await fetchServiceRoles(data?.service_id)
  }

  const fetchRoles = async (userId) => {
    const { data } = await supabase
      .from('utilisateur_roles')
      .select('roles(nom)')
      .eq('user_id', userId)
    const noms = data?.map(r => r.roles.nom) ?? []
    setRoles(noms)
  }

  useEffect(() => {
    // 1. Charger la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        Promise.all([
          fetchProfile(u.id),
          fetchRoles(u.id),
        ]).then(() => {
          initialSessionHandled.current = true
          setLoading(false)
        })
      } else {
        initialSessionHandled.current = true
        setServiceRolesLoaded(true)
        setLoading(false)
      }
    })

    // 2. Écouter les changements d'auth (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Ignorer INITIAL_SESSION car getSession() l'a déjà traité
        if (event === 'INITIAL_SESSION') return

        // Ignorer aussi TOKEN_REFRESHED pour éviter des re-fetch inutiles
        if (event === 'TOKEN_REFRESHED') return

        const u = session?.user ?? null
        setUser(u)

        if (u) {
          // SIGNED_IN (nouveau login) → recharger tout
          fetchProfile(u.id)
          fetchRoles(u.id)
        } else {
          // SIGNED_OUT → tout vider
          setProfile(null)
          setRoles([])
          setServiceRoles([])
          setServiceRolesLoaded(true)
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

  // ── Helpers rôles directs ──
  const hasRole = (roleName) => roles.includes(roleName)
  const hasAnyRole = (roleNames) => roleNames.some(r => roles.includes(r))

  // ── Helpers rôles via service (insensible à la casse sur module_code) ──
  const hasModuleAccess = (moduleCode) =>
    serviceRoles.some(sr => eqIgnoreCase(sr.module_code, moduleCode))

  const hasModuleRole = (moduleCode, roleName) =>
    serviceRoles.some(sr =>
      eqIgnoreCase(sr.module_code, moduleCode) && sr.role_nom === roleName
    )

  const hasAnyModuleRole = (moduleCode, roleNames) =>
    roleNames.some(r =>
      serviceRoles.some(sr =>
        eqIgnoreCase(sr.module_code, moduleCode) && sr.role_nom === r
      )
    )

  const getModuleRoles = (moduleCode) =>
    serviceRoles
      .filter(sr => eqIgnoreCase(sr.module_code, moduleCode))
      .map(sr => sr.role_nom)

  const getAccessibleModules = () => {
    const unique = new Map()
    serviceRoles.forEach(sr => {
      const key = sr.module_code?.toLowerCase()
      if (key && !unique.has(key)) {
        unique.set(key, { code: sr.module_code, nom: sr.module_nom })
      }
    })
    return Array.from(unique.values())
  }



  return (
    <AuthContext.Provider value={{
      user, profile, roles, serviceRoles, loading, serviceRolesLoaded,
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