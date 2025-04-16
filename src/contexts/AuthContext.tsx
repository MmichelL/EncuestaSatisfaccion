import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

// Definir la interfaz para el contexto de autenticación
interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{
    error: Error | null
    data: { user: User | null; session: Session | null } | null
  }>
  signInWithLink: (email: string, redirectTo?: string) => Promise<{
    error: Error | null
    data: { user: User | null; session: Session | null } | null
  }>
  signUp: (email: string, password: string, redirectTo?: string) => Promise<{
    error: Error | null
    data: { user: User | null; session: Session | null } | null
  }>
  resetPassword: (email: string, redirectTo?: string) => Promise<{
    error: Error | null
    data: any
  }>
  updatePassword: (newPassword: string) => Promise<{
    error: Error | null
    data: { user: User | null } | null
  }>
  signOut: () => Promise<void>
}

// Crear el contexto con un valor inicial
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Hook personalizado para usar el contexto de autenticación
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}

// Proveedor del contexto de autenticación
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Obtener la sesión actual al cargar
    const getInitialSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setSession(data.session)
        setUser(data.session?.user ?? null)
      } catch (error) {
        console.error('Error al obtener la sesión inicial:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getInitialSession()

    // Suscribirse a los cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    // Limpiar la suscripción al desmontar
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Función para iniciar sesión con email y contraseña
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { data, error }
    } catch (error) {
      console.error('Error al iniciar sesión:', error)
      return { data: null, error: error as Error }
    }
  }

  // Función para iniciar sesión con link mágico
  const signInWithLink = async (email: string, redirectTo?: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo || `${window.location.origin}/auth/callback`,
        },
      })
      return { data, error }
    } catch (error) {
      console.error('Error al enviar el link de inicio de sesión:', error)
      return { data: null, error: error as Error }
    }
  }

  // Función para registrarse
  const signUp = async (email: string, password: string, redirectTo?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo || `${window.location.origin}/auth/verify`,
        },
      })
      return { data, error }
    } catch (error) {
      console.error('Error al registrarse:', error)
      return { data: null, error: error as Error }
    }
  }

  // Función para restablecer la contraseña
  const resetPassword = async (email: string, redirectTo?: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${window.location.origin}/auth/update-password`,
      })
      return { data, error }
    } catch (error) {
      console.error('Error al solicitar restablecimiento de contraseña:', error)
      return { data: null, error: error as Error }
    }
  }

  // Función para actualizar la contraseña
  const updatePassword = async (newPassword: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      return { data, error }
    } catch (error) {
      console.error('Error al actualizar la contraseña:', error)
      return { data: null, error: error as Error }
    }
  }

  // Función para cerrar sesión
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  // Proporcionar el contexto a los componentes hijos
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signInWithLink,
        signUp,
        resetPassword,
        updatePassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
