import { Package } from 'lucide-react'

/**
 * Página de gestión de lotes de códigos
 * Permite crear y gestionar lotes de códigos de producto
 */
export default function CodeBatchesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Lotes de Códigos</h1>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Nuevo Lote
        </button>
      </div>
      
      <div className="rounded-lg border bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center space-x-4">
          <Package size={48} className="text-blue-500" />
          <p className="text-lg text-gray-600">
            Gestiona lotes de códigos de producto para las encuestas. Crea nuevos lotes, asigna
            productos y genera códigos únicos.
          </p>
        </div>
      </div>
    </div>
  )
}
