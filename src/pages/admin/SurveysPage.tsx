import { ClipboardList } from 'lucide-react'

/**
 * Página de gestión de encuestas
 * Permite crear, editar y eliminar encuestas
 */
export default function SurveysPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Encuestas</h1>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Nueva Encuesta
        </button>
      </div>
      
      <div className="rounded-lg border bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center space-x-4">
          <ClipboardList size={48} className="text-blue-500" />
          <p className="text-lg text-gray-600">
            Aquí podrás gestionar las encuestas de satisfacción. Crea nuevas encuestas, edita las
            existentes y visualiza sus resultados.
          </p>
        </div>
      </div>
    </div>
  )
}
