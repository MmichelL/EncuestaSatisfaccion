import { Navigate, Outlet } from 'react-router-dom'

/**
 * Componente que protege rutas que requieren autenticación
 * Redirige a la página de login si el usuario no está autenticado
 * 
 * Nota: Este es un componente placeholder. La lógica de autenticación
 * real se implementará en un paso posterior.
 */
export default function ProtectedRoute() {
  // Placeholder para la lógica de autenticación
  // En una implementación real, esto verificaría el estado de autenticación
  // usando Supabase o un contexto de autenticación
  const isAuthenticated = false // Cambiar a true para probar las rutas protegidas

  // Si no está autenticado, redirigir a la página de login
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  // Si está autenticado, renderizar las rutas hijas
  return <Outlet />
}
