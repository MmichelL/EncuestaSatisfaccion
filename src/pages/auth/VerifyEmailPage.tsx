import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

/**
 * Página de verificación de email
 */
export default function VerifyEmailPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Verificar si el usuario llegó a través de un enlace de verificación
    const hash = window.location.hash
    const isVerificationLink = hash.includes('type=signup') || hash.includes('type=email_change')

    if (isVerificationLink) {
      // El usuario está en proceso de verificación
      // Supabase maneja automáticamente la verificación
      // Solo necesitamos esperar a que el estado de autenticación cambie
      const checkVerification = async () => {
        try {
          // Esperar un momento para que Supabase procese la verificación
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          if (user) {
            setVerified(true)
          } else {
            setError('No se pudo verificar el email. Por favor, intenta de nuevo o contacta a soporte.')
          }
        } catch (error) {
          console.error('Error al verificar el email:', error)
          setError('Ocurrió un error durante la verificación. Por favor, intenta de nuevo.')
        } finally {
          setVerifying(false)
        }
      }

      checkVerification()
    } else {
      // Si el usuario no llegó a través de un enlace de verificación, redirigir al login
      navigate('/auth/login')
    }
  }, [user, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Encuestas de Satisfacción</h1>
          <p className="text-gray-500 mt-2">Verificación de cuenta</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Verificación de Email</CardTitle>
            <CardDescription>
              Verificando tu dirección de correo electrónico
            </CardDescription>
          </CardHeader>
          <CardContent>
            {verifying ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500">Verificando tu email...</p>
              </div>
            ) : error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : verified ? (
              <Alert variant="success" className="mb-4 bg-green-50 text-green-800 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Email verificado</AlertTitle>
                <AlertDescription>
                  Tu dirección de correo electrónico ha sido verificada exitosamente.
                  Ahora puedes iniciar sesión en tu cuenta.
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link to="/auth/login">
              <Button>Ir a Iniciar Sesión</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
