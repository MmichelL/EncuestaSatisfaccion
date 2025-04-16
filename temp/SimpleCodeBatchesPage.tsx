import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export default function CodeBatchesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold text-gray-900">Lotes de Códigos</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Lote
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-center text-gray-600">
          No hay lotes de códigos disponibles.
        </p>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Lote</DialogTitle>
            <DialogDescription>
              Esta es una versión simplificada para probar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>Contenido del formulario iría aquí</p>
            <Button 
              className="mt-4 w-full" 
              onClick={() => setIsDialogOpen(false)}
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
