import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

// Tipos de preguntas disponibles
const QUESTION_TYPES = [
  { value: 'text_short', label: 'Texto Corto' },
  { value: 'text_long', label: 'Texto Largo (Textarea)' },
  { value: 'radio', label: 'Opción Única (Radio)' },
  { value: 'checkbox', label: 'Opción Múltiple (Checkbox)' },
  { value: 'scale', label: 'Escala (Numérica)' },
  { value: 'dropdown', label: 'Desplegable (Dropdown)' },
  { value: 'email', label: 'Campo Email' },
  { value: 'phone', label: 'Campo Teléfono' },
  { value: 'name', label: 'Campo Nombre' },
] as const

// Esquema de validación para una pregunta
const questionSchema = z.object({
  question_text: z.string().min(1, 'El texto de la pregunta es requerido'),
  question_type: z.enum(['text_short', 'text_long', 'radio', 'checkbox', 'scale', 'dropdown', 'email', 'phone', 'name']),
  options: z.string().optional(),
  is_required: z.boolean().default(false),
  question_order: z.coerce.number().int('Debe ser un número entero').min(0),
})

// Tipo inferido del esquema
export type QuestionFormValues = z.infer<typeof questionSchema>

// Props para el componente
interface QuestionFormProps {
  sectionId: string
  initialData?: QuestionFormValues & { id?: string }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: QuestionFormValues) => Promise<void>
}

export default function QuestionForm({
  sectionId,
  initialData,
  open,
  onOpenChange,
  onSubmit,
}: QuestionFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [showOptionsField, setShowOptionsField] = useState(false)

  // Configurar el formulario con react-hook-form y zod
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: initialData || {
      question_text: '',
      question_type: 'text_short',
      options: '',
      is_required: true,
      question_order: 0,
    },
  })

  // Actualizar la visibilidad del campo de opciones según el tipo de pregunta
  useEffect(() => {
    const questionType = form.watch('question_type')
    setShowOptionsField(
      questionType === 'radio' ||
      questionType === 'checkbox' ||
      questionType === 'dropdown' ||
      questionType === 'scale'
    )
  }, [form.watch('question_type')])

  // Manejar el envío del formulario
  const handleSubmit = async (data: QuestionFormValues) => {
    try {
      setSubmitting(true)
      await onSubmit({
        ...data,
        // Asegurarse de que los valores numéricos sean números
        question_order: Number(data.question_order),
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
            {initialData?.id ? 'Editar Pregunta' : 'Crear Nueva Pregunta'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Texto de la pregunta */}
            <FormField
              control={form.control}
              name="question_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto de la pregunta</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="¿Cómo calificarías nuestro producto?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de pregunta */}
            <FormField
              control={form.control}
              name="question_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de pregunta</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {QUESTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Opciones (solo para tipos específicos) */}
            {showOptionsField && (
              <FormField
                control={form.control}
                name="options"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opciones</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={
                          form.watch('question_type') === 'scale'
                            ? 'Formato: {"min": 1, "max": 5, "labels": ["Muy malo", "Malo", "Regular", "Bueno", "Muy bueno"]}'
                            : 'Una opción por línea'
                        }
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      {form.watch('question_type') === 'scale'
                        ? 'Ingresa un objeto JSON con min, max y labels opcionales'
                        : 'Ingresa una opción por línea'}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Orden */}
              <FormField
                control={form.control}
                name="question_order"
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

              {/* ¿Es requerida? */}
              <FormField
                control={form.control}
                name="is_required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-md border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Requerida</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
                  ? 'Actualizar Pregunta'
                  : 'Crear Pregunta'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
