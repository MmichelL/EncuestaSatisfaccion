import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Componente que protege rutas que requieren autenticación
 * Redirige a la página de login si el usuario no está autenticado
 * Utiliza el contexto de autenticación para verificar el estado
 */
export default function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  // Mostrar un indicador de carga mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, redirigir a la página de login
  // Guardar la ubicación actual para redirigir después del login
  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  // Si está autenticado, renderizar las rutas hijas
  return <Outlet />
}
