import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Save, Upload, AlertCircle, CheckCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { supabase } from '@/lib/supabaseClient'

// Esquema de validación con Zod
const settingsFormSchema = z.object({
  company_name: z.string().min(1, 'El nombre de la empresa es obligatorio'),
  default_discount_template: z.string().min(1, 'La plantilla de descuento es obligatoria'),
  default_discount_validity_days: z.coerce
    .number()
    .int('Debe ser un número entero')
    .positive('Debe ser un número positivo'),
  company_logo_url: z.string().optional(),
})

// Tipo para los valores del formulario
type SettingsFormValues = z.infer<typeof settingsFormSchema>

/**
 * Página de configuraciones de la aplicación
 */
export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Configurar el formulario con React Hook Form y Zod
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      company_name: '',
      default_discount_template: '',
      default_discount_validity_days: 30,
      company_logo_url: '',
    },
  })

  // Cargar las configuraciones actuales
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error } = await supabase.from('settings').select('*')

        if (error) throw error

        if (data && data.length > 0) {
          // Transformar el array de objetos {key, value} a un objeto
          const settingsObj = data.reduce((acc, item) => {
            acc[item.key] = item.value
            return acc
          }, {} as Record<string, string>)

          // Actualizar el formulario con los valores obtenidos
          form.reset({
            company_name: settingsObj.company_name || '',
            default_discount_template: settingsObj.default_discount_template || '',
            default_discount_validity_days: parseInt(settingsObj.default_discount_validity_days || '30'),
            company_logo_url: settingsObj.company_logo_url || '',
          })

          // Establecer la vista previa del logo si existe
          if (settingsObj.company_logo_url) {
            setLogoPreview(settingsObj.company_logo_url)
          }
        }
      } catch (error) {
        console.error('Error al cargar las configuraciones:', error)
        setError('No se pudieron cargar las configuraciones. Por favor, intenta de nuevo.')
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [form])

  // Manejar la subida del logo
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      setError(null)

      // Validar el tipo de archivo
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen')
      }

      // Validar el tamaño del archivo (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('El archivo no debe superar los 2MB')
      }

      // Generar un nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Subir el archivo a Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Obtener la URL pública del archivo
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      // Actualizar el formulario con la URL del logo
      form.setValue('company_logo_url', publicUrl)
      setLogoPreview(publicUrl)

      // Limpiar el input de archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error('Error al subir el logo:', error)
      setError(`Error al subir el logo: ${error.message || 'Intenta de nuevo'}`)
    } finally {
      setLoading(false)
    }
  }

  // Guardar las configuraciones
  const onSubmit = async (data: SettingsFormValues) => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Preparar los datos para la actualización
      const updates = [
        { key: 'company_name', value: data.company_name },
        { key: 'default_discount_template', value: data.default_discount_template },
        { key: 'default_discount_validity_days', value: data.default_discount_validity_days.toString() },
        { key: 'company_logo_url', value: data.company_logo_url || '' },
      ]

      // Actualizar cada configuración
      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert(update, { onConflict: 'key' })

        if (error) throw error
      }

      setSuccess('Configuraciones guardadas exitosamente')
    } catch (error) {
      console.error('Error al guardar las configuraciones:', error)
      setError('No se pudieron guardar las configuraciones. Por favor, intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuraciones</h1>
        <p className="mt-1 text-gray-500">
          Administra las configuraciones generales de la aplicación.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>Éxito</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
          <span className="ml-2">Cargando configuraciones...</span>
        </div>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Empresa</CardTitle>
              <CardDescription>
                Configura la información básica de tu empresa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la Empresa</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nombre de la empresa" />
                        </FormControl>
                        <FormDescription>
                          Este nombre se mostrará en las encuestas y correos electrónicos.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <div>
                      <FormLabel>Logo de la Empresa</FormLabel>
                      <div className="mt-2 flex items-center gap-4">
                        {logoPreview ? (
                          <div className="relative h-24 w-24 overflow-hidden rounded-md border">
                            <img
                              src={logoPreview}
                              alt="Logo de la empresa"
                              className="h-full w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded-md border bg-gray-50">
                            <span className="text-sm text-gray-500">Sin logo</span>
                          </div>
                        )}
                        <div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            <span>Subir logo</span>
                          </Button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleLogoUpload}
                            accept="image/*"
                            className="hidden"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Formatos: JPG, PNG, GIF. Máximo 2MB.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="default_discount_template"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plantilla de Descuento por Defecto</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="DESC{percentage}" />
                        </FormControl>
                        <FormDescription>
                          Usa {'{percentage}'} como marcador para el porcentaje de descuento.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_discount_validity_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Validez del Descuento por Defecto (días)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" />
                        </FormControl>
                        <FormDescription>
                          Número de días que serán válidos los códigos de descuento generados.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={saving} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Guardando...' : 'Guardar Configuraciones'}</span>
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
