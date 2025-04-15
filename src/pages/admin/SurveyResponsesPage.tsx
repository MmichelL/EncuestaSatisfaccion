import { FileText } from 'lucide-react'

/**
 * Página de respuestas de encuestas
 * Muestra las respuestas recibidas de las encuestas
 */
export default function SurveyResponsesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Respuestas de Encuestas</h1>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Exportar Datos
        </button>
      </div>
      
      <div className="rounded-lg border bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center space-x-4">
          <FileText size={48} className="text-blue-500" />
          <p className="text-lg text-gray-600">
            Visualiza y analiza las respuestas de las encuestas. Filtra por encuesta, fecha o
            producto y exporta los resultados para análisis detallado.
          </p>
        </div>
      </div>
    </div>
  )
}
