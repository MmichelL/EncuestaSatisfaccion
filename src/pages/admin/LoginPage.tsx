import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation } from 'react-router-dom'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

// Esquema de validación con Zod
const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

// Tipo inferido del esquema
type LoginFormValues = z.infer<typeof loginSchema>

/**
 * Página de inicio de sesión para administradores
 * Utiliza react-hook-form con validación Zod
 */
export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Obtener la ruta a la que redirigir después del login
  const from = location.state?.from?.pathname || '/admin'

  // Configurar react-hook-form con validación Zod
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Manejar el envío del formulario
  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true)
      setError(null)

      const { error: signInError } = await signIn(data.email, data.password)

      if (signInError) {
        setError('Credenciales inválidas. Por favor, verifica tu correo y contraseña.')
        return
      }

      // Redirigir al usuario a la página anterior o al dashboard
      navigate(from, { replace: true })
    } catch (err) {
      setError('Ocurrió un error al iniciar sesión. Por favor, intenta de nuevo.')
      console.error('Error de inicio de sesión:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-gray-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-600">Encuesta Satisfacción</h1>
          <p className="mt-2 text-gray-600">Panel de Administración</p>
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-center text-2xl font-bold text-gray-800">Iniciar Sesión</CardTitle>
            <p className="text-center text-sm text-gray-500">
              Ingresa tus credenciales para acceder
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  className="h-11 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1 text-xs font-medium text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="h-11 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="mt-1 text-xs font-medium text-red-500">{errors.password.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="mt-2 h-11 w-full bg-blue-600 font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-blue-500"
                disabled={isLoading}
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
