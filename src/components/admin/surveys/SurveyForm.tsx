import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

// Esquema de validación para una encuesta
const surveySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z
    .string()
    .min(1, 'El slug es requerido')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug debe tener formato válido (solo letras minúsculas, números y guiones)'),
  description: z.string().optional(),
  is_active: z.boolean().default(false),
  requires_product_code: z.boolean().default(false),
  discount_code_template: z.string().min(1, 'La plantilla de código de descuento es requerida'),
  discount_code_validity_days: z.coerce
    .number()
    .int('Debe ser un número entero')
    .min(0, 'No puede ser un número negativo'),
})

// Tipo inferido del esquema
export type SurveyFormValues = z.infer<typeof surveySchema>

// Props para el componente
interface SurveyFormProps {
  initialData?: SurveyFormValues
  onSubmit: (data: SurveyFormValues) => Promise<void>
  isSubmitting?: boolean
}

export default function SurveyForm({ initialData, onSubmit, isSubmitting = false }: SurveyFormProps) {
  const [submitting, setSubmitting] = useState(isSubmitting)

  // Configurar el formulario con react-hook-form y zod
  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(surveySchema),
    defaultValues: initialData || {
      name: '',
      slug: '',
      description: '',
      is_active: false,
      requires_product_code: false,
      discount_code_template: 'DESC-{CODE}',
      discount_code_validity_days: 30,
    },
  })

  // Manejar el envío del formulario
  const handleSubmit = async (data: SurveyFormValues) => {
    try {
      setSubmitting(true)
      await onSubmit(data)
    } catch (error) {
      console.error('Error al enviar el formulario:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Nombre */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Encuesta de satisfacción" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Slug */}
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input placeholder="encuesta-satisfaccion" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Descripción */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe brevemente el propósito de esta encuesta..."
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* ¿Está activa? */}
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Encuesta Activa</FormLabel>
                  <div className="text-sm text-gray-500">
                    Determina si la encuesta está disponible para los usuarios
                  </div>
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

          {/* ¿Requiere código de producto? */}
          <FormField
            control={form.control}
            name="requires_product_code"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Requiere Código de Producto</FormLabel>
                  <div className="text-sm text-gray-500">
                    El usuario debe ingresar un código de producto válido
                  </div>
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Plantilla de código de descuento */}
          <FormField
            control={form.control}
            name="discount_code_template"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plantilla de Código de Descuento</FormLabel>
                <FormControl>
                  <Input placeholder="DESC-{CODE}" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Días de validez del código de descuento */}
          <FormField
            control={form.control}
            name="discount_code_validity_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Días de Validez</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Guardando...' : initialData ? 'Actualizar Encuesta' : 'Crear Encuesta'}
        </Button>
      </form>
    </Form>
  )
}
