import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

// Esquema de validación para una sección
const sectionSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  section_order: z.coerce.number().int('Debe ser un número entero').min(0),
  discount_percentage_cumulative: z.coerce
    .number()
    .min(0, 'No puede ser un número negativo')
    .max(100, 'No puede ser mayor a 100'),
})

// Tipo inferido del esquema
export type SectionFormValues = z.infer<typeof sectionSchema>

// Props para el componente
interface SectionFormProps {
  surveyId: string
  initialData?: SectionFormValues & { id?: string }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SectionFormValues) => Promise<void>
}

export default function SectionForm({
  surveyId,
  initialData,
  open,
  onOpenChange,
  onSubmit,
}: SectionFormProps) {
  const [submitting, setSubmitting] = useState(false)

  // Configurar el formulario con react-hook-form y zod
  const form = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: initialData || {
      title: '',
      description: '',
      section_order: 0,
      discount_percentage_cumulative: 0,
    },
  })

  // Manejar el envío del formulario
  const handleSubmit = async (data: SectionFormValues) => {
    try {
      setSubmitting(true)
      await onSubmit({
        ...data,
        // Asegurarse de que los valores numéricos sean números
        section_order: Number(data.section_order),
        discount_percentage_cumulative: Number(data.discount_percentage_cumulative),
      })
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Error al enviar el formulario:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? 'Editar Sección' : 'Crear Nueva Sección'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Título */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Título de la sección" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción de la sección (opcional)"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Orden */}
              <FormField
                control={form.control}
                name="section_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Porcentaje de descuento acumulativo */}
              <FormField
                control={form.control}
                name="discount_percentage_cumulative"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>% Descuento Acumulativo</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? 'Guardando...'
                  : initialData?.id
                  ? 'Actualizar Sección'
                  : 'Crear Sección'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
