import { Settings } from 'lucide-react'

/**
 * Página de configuración
 * Permite ajustar configuraciones del sistema
 */
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Guardar Cambios
        </button>
      </div>
      
      <div className="rounded-lg border bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center space-x-4">
          <Settings size={48} className="text-blue-500" />
          <p className="text-lg text-gray-600">
            Configura los parámetros del sistema, gestiona usuarios administradores y ajusta las
            preferencias generales de la aplicación.
          </p>
        </div>
      </div>
    </div>
  )
}
