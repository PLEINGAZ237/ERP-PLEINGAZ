import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [roles, setRoles]     = useState([])   // ex: ['Employe', 'DFC']
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*, entreprises(nom), departements(nom)')
      .eq('id', userId)
      .single()
    setProfile(data)
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
  }

  // Vérifie si l'user a UN rôle précis
  const hasRole = (roleName) => roles.includes(roleName)

  // Vérifie si l'user a AU MOINS UN des rôles listés
  const hasAnyRole = (roleNames) => roleNames.some(r => roles.includes(r))

  return (
    <AuthContext.Provider value={{
      user, profile, roles, loading,
      signIn, signOut, fetchProfile,
      hasRole, hasAnyRole
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)