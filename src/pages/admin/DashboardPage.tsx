import { BarChart3 } from 'lucide-react'

/**
 * Página de Dashboard para el panel de administración
 * Muestra un resumen de la actividad y estadísticas
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>
      
      <div className="rounded-lg border bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center space-x-4">
          <BarChart3 size={48} className="text-blue-500" />
          <p className="text-lg text-gray-600">
            Bienvenido al panel de administración. Aquí podrás gestionar encuestas, códigos de
            producto y ver estadísticas.
          </p>
        </div>
      </div>
    </div>
  )
}
