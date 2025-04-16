import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Esquema de validación para el formulario de login
const loginSchema = z.object({
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

// Esquema de validación para el formulario de login con link
const magicLinkSchema = z.object({
  email: z.string().email('Ingresa un email válido'),
})

// Tipos para los valores de los formularios
type LoginFormValues = z.infer<typeof loginSchema>
type MagicLinkFormValues = z.infer<typeof magicLinkSchema>

/**
 * Página de inicio de sesión
 */
export default function LoginPage() {
  const { signIn, signInWithLink } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  // Configurar el formulario de login con contraseña
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Configurar el formulario de login con link
  const magicLinkForm = useForm<MagicLinkFormValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: '',
    },
  })

  // Manejar el envío del formulario de login con contraseña
  const handleLoginSubmit = async (data: LoginFormValues) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await signIn(data.email, data.password)

      if (error) {
        throw error
      }

      // Redirigir al dashboard o página principal
      navigate('/admin/dashboard')
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error)
      setError(error.message || 'Error al iniciar sesión. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Manejar el envío del formulario de login con link
  const handleMagicLinkSubmit = async (data: MagicLinkFormValues) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await signInWithLink(data.email)

      if (error) {
        throw error
      }

      // Mostrar mensaje de éxito
      setMagicLinkSent(true)
    } catch (error: any) {
      console.error('Error al enviar el link de inicio de sesión:', error)
      setError(error.message || 'Error al enviar el link. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Encuestas de Satisfacción</h1>
          <p className="text-gray-500 mt-2">Inicia sesión para acceder al panel de administración</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>
              Elige un método para iniciar sesión en tu cuenta
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

            {magicLinkSent ? (
              <div className="text-center py-4">
                <h3 className="text-lg font-medium text-green-600 mb-2">¡Link enviado!</h3>
                <p className="text-gray-500 mb-4">
                  Hemos enviado un enlace de inicio de sesión a tu correo electrónico.
                  Por favor, revisa tu bandeja de entrada y haz clic en el enlace para iniciar sesión.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setMagicLinkSent(false)}
                >
                  Volver
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="password" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="password">Contraseña</TabsTrigger>
                  <TabsTrigger value="magic-link">Link Mágico</TabsTrigger>
                </TabsList>

                <TabsContent value="password">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
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

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  {...field}
                                  type="password"
                                  placeholder="••••••"
                                  className="pl-10"
                                  disabled={loading}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="text-right">
                        <Link
                          to="/auth/reset-password"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          ¿Olvidaste tu contraseña?
                        </Link>
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                      >
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="magic-link">
                  <Form {...magicLinkForm}>
                    <form onSubmit={magicLinkForm.handleSubmit(handleMagicLinkSubmit)} className="space-y-4">
                      <FormField
                        control={magicLinkForm.control}
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

                      <div className="text-sm text-gray-500 mt-2">
                        Te enviaremos un enlace a tu correo electrónico para iniciar sesión sin contraseña.
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                      >
                        {loading ? 'Enviando link...' : 'Enviar Link de Acceso'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-4">
            <div className="text-sm text-gray-500">
              ¿No tienes una cuenta?{' '}
              <Link to="/auth/register" className="text-blue-600 hover:underline">
                Regístrate
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
