import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'

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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { supabase } from '@/lib/supabaseClient'

// Esquema de validación para el código de producto
const productCodeSchema = z.object({
  codeValue: z.string().min(1, 'El código de producto es obligatorio'),
})

// Tipo para los valores del formulario
type ProductCodeFormValues = z.infer<typeof productCodeSchema>

// Estados de la página
type PageState = 'loading' | 'not-found' | 'code-required' | 'survey-display'

/**
 * Página pública para mostrar y responder una encuesta
 */
export default function SurveyPage() {
  const { slug } = useParams<{ slug: string }>()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [survey, setSurvey] = useState<any>(null)
  const [codeId, setCodeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validatingCode, setValidatingCode] = useState(false)

  // Configurar el formulario para el código de producto
  const form = useForm<ProductCodeFormValues>({
    resolver: zodResolver(productCodeSchema),
    defaultValues: {
      codeValue: '',
    },
  })

  // Cargar los detalles de la encuesta
  useEffect(() => {
    const fetchSurvey = async () => {
      if (!slug) {
        setPageState('not-found')
        return
      }

      try {
        const { data, error } = await supabase
          .from('surveys')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single()

        if (error) {
          console.error('Error al cargar la encuesta:', error)
          setPageState('not-found')
          return
        }

        if (!data) {
          setPageState('not-found')
          return
        }

        setSurvey(data)

        // Determinar el estado inicial de la página
        if (data.requires_product_code) {
          setPageState('code-required')
        } else {
          setPageState('survey-display')
        }
      } catch (error) {
        console.error('Error al cargar la encuesta:', error)
        setPageState('not-found')
      }
    }

    fetchSurvey()
  }, [slug])

  // Validar el código de producto
  const validateProductCode = async (data: ProductCodeFormValues) => {
    if (!survey) return

    try {
      setValidatingCode(true)
      setError(null)

      // Llamar a la Edge Function para validar el código
      const { data: responseData, error } = await supabase.functions.invoke('validate-product-code', {
        body: {
          codeValue: data.codeValue,
          surveyId: survey.id,
        },
      })

      if (error) {
        throw new Error('Error al validar el código: ' + error.message)
      }

      if (responseData.success) {
        // Guardar el ID del código validado y cambiar al estado de mostrar la encuesta
        setCodeId(responseData.codeId)
        setPageState('survey-display')
      } else {
        // Mostrar el mensaje de error de la Edge Function
        setError(responseData.message || 'Código no válido. Por favor, intenta con otro código.')
      }
    } catch (error: any) {
      console.error('Error al validar el código:', error)
      setError(error.message || 'Error al validar el código. Por favor, intenta de nuevo.')
    } finally {
      setValidatingCode(false)
    }
  }

  // Renderizar según el estado de la página
  const renderContent = () => {
    switch (pageState) {
      case 'loading':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Cargando encuesta...</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
            </CardContent>
          </Card>
        )

      case 'not-found':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Encuesta no encontrada</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500">
                La encuesta que estás buscando no existe o no está activa.
              </p>
            </CardContent>
          </Card>
        )

      case 'code-required':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle>{survey?.name}</CardTitle>
              <CardDescription>
                Para acceder a esta encuesta, por favor ingresa el código de producto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(validateProductCode)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="codeValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de Producto</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ingresa el código de producto" />
                        </FormControl>
                        <FormDescription>
                          El código se encuentra en el producto o en el recibo de compra.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={validatingCode}
                  >
                    {validatingCode ? 'Validando...' : 'Continuar'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )

      case 'survey-display':
        return (
          <Card className="w-full max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>{survey?.name}</CardTitle>
              <CardDescription>
                {survey?.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="success" className="mb-4 bg-green-50 text-green-800 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Encuesta lista</AlertTitle>
                <AlertDescription>
                  {codeId 
                    ? 'Código de producto validado correctamente. Ahora puedes completar la encuesta.' 
                    : 'Puedes comenzar a completar la encuesta.'}
                </AlertDescription>
              </Alert>

              {/* Aquí iría el componente para mostrar y responder la encuesta */}
              <div className="text-center py-8 text-gray-500">
                <p>Aquí se mostraría el contenido de la encuesta.</p>
                <p className="mt-2">
                  <strong>ID de la encuesta:</strong> {survey?.id}
                  {codeId && (
                    <>
                      <br />
                      <strong>ID del código:</strong> {codeId}
                    </>
                  )}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button>Comenzar Encuesta</Button>
            </CardFooter>
          </Card>
        )
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {renderContent()}
      </div>
    </div>
  )
}
