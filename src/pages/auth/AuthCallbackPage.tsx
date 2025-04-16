import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'

/**
 * Página de callback para autenticación
 * Esta página se utiliza como redirección después de autenticarse con un link mágico
 */
export default function AuthCallbackPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Verificar si el usuario está autenticado
    if (user) {
      // Redirigir al dashboard
      navigate('/admin/dashboard')
    }
  }, [user, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">Iniciando sesión...</h1>
        <p className="text-gray-500">Por favor, espera mientras te redirigimos.</p>
      </div>
    </div>
  )
}
