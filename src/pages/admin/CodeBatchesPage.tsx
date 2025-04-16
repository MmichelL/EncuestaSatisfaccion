import { useState, useEffect } from 'react'
import { Package, Plus, Loader2, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import CreateCodeBatchForm from '@/components/admin/code-batches/CreateCodeBatchForm'
import { supabase } from '@/lib/supabaseClient'

// Tipo para los lotes de códigos
interface CodeBatch {
  id: string
  name: string
  description: string | null
  created_at: string
  total_codes: number
  used_codes: number
}

/**
 * Página de gestión de lotes de códigos
 * Permite crear y gestionar lotes de códigos de producto
 */
export default function CodeBatchesPage() {
  const navigate = useNavigate()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [codeBatches, setCodeBatches] = useState<CodeBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar los lotes de códigos
  const loadCodeBatches = async () => {
    try {
      setLoading(true)
      setError(null)

      // Consulta para obtener los lotes de códigos con conteo de códigos
      const { data, error } = await supabase
        .from('code_batches')
        .select(`
          *,
          total_codes:product_codes(count),
          used_codes:product_codes(count).filter(status.eq.used)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transformar los datos para obtener los conteos correctos
      const formattedData = data.map((batch: any) => ({
        ...batch,
        // Extraer el count, con valor por defecto 0
        total_codes: batch.total_codes?.[0]?.count ?? 0,
        used_codes: batch.used_codes?.[0]?.count ?? 0
      }))

      setCodeBatches(formattedData)
    } catch (err: any) {
      console.error('Error al cargar lotes de códigos:', err)
      setError('No se pudieron cargar los lotes de códigos')
    } finally {
      setLoading(false)
    }
  }

  // Cargar los lotes al montar el componente
  useEffect(() => {
    loadCodeBatches()
  }, [])

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between space-y-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Lotes de Códigos</h1>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nuevo Lote
        </Button>
      </div>

      {/* Mensaje de error */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Contenido principal */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Cargando lotes de códigos...</span>
        </div>
      ) : codeBatches.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <Package size={48} className="text-blue-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-800">No hay lotes de códigos</h3>
              <p className="mt-2 text-gray-600">
                Crea tu primer lote de códigos para comenzar a gestionar tus productos.
              </p>
            </div>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="mt-2"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear Primer Lote
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-800">Lotes de Códigos Disponibles</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={loadCodeBatches}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {codeBatches.map((batch) => (
              <Card key={batch.id} className="overflow-hidden border-gray-200 shadow-sm transition-all hover:shadow-md">
                <CardHeader className="bg-gray-50 pb-3 pt-3">
                  <CardTitle className="text-base font-medium text-gray-800">{batch.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {batch.description && (
                      <p className="text-sm text-gray-600">{batch.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Total:</span>{' '}
                        <span>{batch.total_codes} códigos</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Usados:</span>{' '}
                        <span>{batch.used_codes} códigos</span>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/product-codes?batch=${batch.id}`)}
                      >
                        Ver Códigos
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Diálogo para crear un nuevo lote de códigos */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Crear Nuevo Lote de Códigos</DialogTitle>
            <DialogDescription>
              Completa el formulario para crear un nuevo lote de códigos de producto.
            </DialogDescription>
          </DialogHeader>
          <CreateCodeBatchForm
            onSuccess={() => {
              setIsDialogOpen(false)
              loadCodeBatches() // Recargar la lista de lotes
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
