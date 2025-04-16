import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { supabase } from '@/lib/supabaseClient'

// Esquema de validación para un lote de códigos
const codeBatchSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  prefix: z.string().min(1, 'El prefijo es requerido'),
  quantity: z.coerce
    .number()
    .int('Debe ser un número entero')
    .min(1, 'Debe generar al menos 1 código')
    .max(1000, 'No puede generar más de 1000 códigos a la vez'),
  length: z.coerce
    .number()
    .int('Debe ser un número entero')
    .min(4, 'La longitud mínima es 4')
    .max(16, 'La longitud máxima es 16'),
})

// Tipo inferido del esquema
type CodeBatchFormValues = z.infer<typeof codeBatchSchema>

// Props para el componente
interface CreateCodeBatchFormProps {
  onSuccess: () => void
}

export default function CreateCodeBatchForm({ onSuccess }: CreateCodeBatchFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)

  // Verificar el estado de autenticación al montar el componente
  useEffect(() => {
    // Obtener la sesión actual
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
    }

    checkSession()

    // Suscribirse a cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Configurar el formulario con react-hook-form y zod
  const form = useForm<CodeBatchFormValues>({
    resolver: zodResolver(codeBatchSchema),
    defaultValues: {
      name: '',
      description: '',
      prefix: 'PROD-',
      quantity: 100,
      length: 8,
    },
  })

  // Manejar el envío del formulario
  const handleSubmit = async (data: CodeBatchFormValues) => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Verificar si el usuario está autenticado
      if (!session) {
        throw new Error('Debes iniciar sesión para crear un lote de códigos')
      }

      // Insertar el nuevo lote de códigos en Supabase
      const { error: insertError, data: insertedBatch } = await supabase
        .from('code_batches')
        .insert([
          {
            name: data.name,
            description: data.description || null,
          },
        ])
        .select()
        .single()

      if (insertError) throw insertError

      // Llamar a la función Edge para generar los códigos
      const { error: functionError } = await supabase.functions.invoke('generate-product-codes', {
        body: {
          batch_id: insertedBatch.id,
          prefix: data.prefix,
          quantity: data.quantity,
          length: data.length, // Usamos el valor del formulario
        },
      })

      if (functionError) throw functionError

      // Notificar éxito
      onSuccess()
    } catch (err: any) {
      console.error('Error al crear lote de códigos:', err)

      // Manejar errores específicos
      if (err.code === '42501') {
        setError('No tienes permisos para crear lotes de códigos. Verifica que tu cuenta tenga rol de administrador.')
      } else {
        setError(err.message || 'Ocurrió un error al crear el lote de códigos')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 py-2">
      {!session && (
        <Alert variant="warning" className="mb-4">
          <AlertTitle>Advertencia</AlertTitle>
          <AlertDescription>No has iniciado sesión o tu sesión ha expirado. Por favor, inicia sesión nuevamente.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Lote</FormLabel>
                <FormControl>
                  <Input placeholder="Productos Junio 2024" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descripción del lote de códigos..."
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <FormField
              control={form.control}
              name="prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prefijo</FormLabel>
                  <FormControl>
                    <Input placeholder="PROD-" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="1000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="length"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Longitud del Código</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="border-gray-300 shadow-sm">
                        <SelectValue placeholder="Selecciona la longitud" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[4, 6, 8, 10, 12, 16].map((length) => (
                        <SelectItem key={length} value={length.toString()}>
                          {length} caracteres
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando lote...
              </>
            ) : (
              'Crear Lote de Códigos'
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
