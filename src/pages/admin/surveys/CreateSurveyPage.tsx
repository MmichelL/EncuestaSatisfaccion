import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import SurveyForm, { SurveyFormValues } from '@/components/admin/surveys/SurveyForm'
import { supabase } from '@/lib/supabaseClient'

/**
 * Página para crear una nueva encuesta
 */
export default function CreateSurveyPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Manejar la creación de una nueva encuesta
  const handleCreate = async (data: SurveyFormValues) => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Insertar la nueva encuesta en Supabase
      const { error } = await supabase.from('surveys').insert([data])

      if (error) throw error

      // Redirigir a la página de listado de encuestas
      navigate('/admin/surveys', { 
        state: { 
          message: 'Encuesta creada exitosamente',
          type: 'success'
        } 
      })
    } catch (error) {
      console.error('Error al crear la encuesta:', error)
      setError('No se pudo crear la encuesta. Por favor, intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/surveys')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Crear Nueva Encuesta</h1>
        <p className="mt-1 text-gray-500">
          Completa el formulario para crear una nueva encuesta de satisfacción.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <SurveyForm onSubmit={handleCreate} isSubmitting={isSubmitting} />
      </div>
    </div>
  )
}
