import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// Esquema de validación para el formulario
const resetPasswordSchema = z.object({
  email: z.string().email('Ingresa un email válido'),
})

// Tipo para los valores del formulario
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

/**
 * Página de restablecimiento de contraseña
 */
export default function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Configurar el formulario
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  // Manejar el envío del formulario
  const handleSubmit = async (data: ResetPasswordFormValues) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await resetPassword(data.email)

      if (error) {
        throw error
      }

      // Mostrar mensaje de éxito
      setEmailSent(true)
    } catch (error: any) {
      console.error('Error al solicitar restablecimiento de contraseña:', error)
      setError(error.message || 'Error al solicitar restablecimiento. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Encuestas de Satisfacción</h1>
          <p className="text-gray-500 mt-2">Restablece tu contraseña</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Restablecer Contraseña</CardTitle>
            <CardDescription>
              Ingresa tu email para recibir un enlace de restablecimiento
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

            {emailSent ? (
              <Alert variant="success" className="mb-4 bg-green-50 text-green-800 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Email enviado</AlertTitle>
                <AlertDescription>
                  Hemos enviado un enlace de restablecimiento a tu correo electrónico.
                  Por favor, revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
                </AlertDescription>
              </Alert>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              {...field}
                              placeholder="tu@email.com"
                              className="pl-10"
                              disabled={loading}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Enviando...' : 'Enviar Enlace de Restablecimiento'}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-4">
            <Link to="/auth/login" className="text-sm text-blue-600 hover:underline flex items-center">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver a Iniciar Sesión
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
