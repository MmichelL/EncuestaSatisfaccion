import { Tag } from 'lucide-react'

/**
 * Página de gestión de códigos de producto
 * Permite ver y gestionar códigos individuales
 */
export default function ProductCodesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Códigos de Producto</h1>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Exportar Códigos
        </button>
      </div>
      
      <div className="rounded-lg border bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center space-x-4">
          <Tag size={48} className="text-blue-500" />
          <p className="text-lg text-gray-600">
            Visualiza y gestiona los códigos de producto individuales. Filtra por lote, estado o
            producto y exporta los resultados.
          </p>
        </div>
      </div>
    </div>
  )
}
