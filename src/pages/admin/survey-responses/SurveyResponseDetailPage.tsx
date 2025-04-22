import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, Tag, User, Calendar, Percent, Gift } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabaseClient'

// Interfaces para los datos
interface Survey {
  id: string
  name: string
  description: string | null
}

interface ProductCode {
  id: string
  code_value: string
  batch_id: string
}

interface Question {
  id: string
  question_text: string
  question_type: string
}

interface Answer {
  id: string
  question_id: string
  answer_value: string
  question: Question
}

interface SurveyResponse {
  id: string
  survey_id: string
  survey: Survey
  start_time: string
  completion_time: string | null
  status: 'in_progress' | 'completed' | 'abandoned'
  discount_percentage_achieved: number | null
  generated_discount_code: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  product_code_id: string | null
  product_code: ProductCode | null
  answers: Answer[]
}

/**
 * Página de detalles de una respuesta de encuesta
 */
export default function SurveyResponseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [response, setResponse] = useState<SurveyResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar los datos de la respuesta
  useEffect(() => {
    const fetchResponseDetails = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)

        // 1. Consulta principal: obtener datos básicos de la respuesta y relaciones de primer nivel
        const { data: responseData, error: responseError } = await supabase
          .from('survey_responses')
          .select(`
            *,
            survey:surveys(id, name, description),
            product_code:product_codes!product_code_id(id, code_value, batch_id)
          `)
          .eq('id', id)
          .single()

        if (responseError) throw responseError
        if (!responseData) throw new Error('Respuesta no encontrada.')

        // Guardar datos básicos de la respuesta
        let detailedResponse: SurveyResponse = {
          ...responseData,
          survey: responseData.survey,
          product_code: responseData.product_code,
          answers: [] // Inicializa answers vacío
        }

        // 2. Segunda consulta: obtener las respuestas y sus preguntas asociadas
        const { data: answersData, error: answersError } = await supabase
          .from('answers')
          .select(`
            *,
            question:questions(*) // Obtener la pregunta relacionada a cada respuesta
          `)
          .eq('response_id', id) // Filtrar por el ID de la respuesta actual

        if (answersError) {
          console.warn('No se pudieron cargar las respuestas detalladas:', answersError)
          // Continuar sin las respuestas en lugar de fallar completamente
        } else {
          // Añadir las respuestas obtenidas al objeto de respuesta detallada
          detailedResponse.answers = answersData || []
        }

        // Establecer el estado final con todos los datos
        setResponse(detailedResponse)
      } catch (error) {
        console.error('Error al cargar los detalles de la respuesta:', error)
        setError('No se pudieron cargar los detalles de la respuesta. Por favor, intenta de nuevo.')
      } finally {
        setLoading(false)
      }
    }

    fetchResponseDetails()
  }, [id])

  // Renderizar el estado de la respuesta
  const renderStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Completada</span>
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>En progreso</span>
          </Badge>
        )
      case 'abandoned':
        return (
          <Badge variant="outline" className="flex items-center gap-1 text-amber-600 border-amber-600">
            <AlertTriangle className="h-3 w-3" />
            <span>Abandonada</span>
          </Badge>
        )
      default:
        return <span>{status}</span>
    }
  }

  // Renderizar el valor de una respuesta según el tipo de pregunta
  const renderAnswerValue = (answer: Answer) => {
    const { question_type } = answer.question
    const value = answer.answer_value

    switch (question_type) {
      case 'single_choice':
      case 'multiple_choice':
        try {
          // Intentar parsear como JSON (para opciones múltiples)
          const options = JSON.parse(value)
          if (Array.isArray(options)) {
            return options.join(', ')
          }
          return value
        } catch {
          // Si no es JSON, mostrar como texto
          return value
        }
      case 'rating':
      case 'scale':
        return (
          <div className="flex items-center">
            <span className="font-medium">{value}</span>
            <span className="ml-2 text-gray-500">/ 5</span>
          </div>
        )
      default:
        return value
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/survey-responses')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver a respuestas
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {loading ? 'Cargando detalles...' : `Detalles de Respuesta`}
        </h1>
        {response && (
          <p className="mt-1 text-gray-500">
            Respuesta a la encuesta "{response.survey?.name}" del {format(new Date(response.start_time), 'dd/MM/yyyy HH:mm', { locale: es })}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
          <span className="ml-2">Cargando detalles de la respuesta...</span>
        </div>
      ) : response ? (
        <div className="space-y-6">
          {/* Información principal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Información de la Respuesta</span>
                {renderStatus(response.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <Label>Fecha de inicio</Label>
                  </div>
                  <Input
                    value={format(new Date(response.start_time), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                    readOnly
                  />
                </div>

                {response.completion_time && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <Label>Fecha de finalización</Label>
                    </div>
                    <Input
                      value={format(new Date(response.completion_time), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                      readOnly
                    />
                  </div>
                )}

                {response.discount_percentage_achieved !== null && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-gray-500" />
                      <Label>Porcentaje de descuento obtenido</Label>
                    </div>
                    <Input
                      value={`${response.discount_percentage_achieved}%`}
                      readOnly
                    />
                  </div>
                )}

                {response.generated_discount_code && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-gray-500" />
                      <Label>Código de descuento generado</Label>
                    </div>
                    <Input
                      value={response.generated_discount_code}
                      readOnly
                      className="font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {response.product_code && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-gray-500" />
                      <Label>Código de producto utilizado</Label>
                    </div>
                    <Input
                      value={response.product_code.code_value}
                      readOnly
                      className="font-mono"
                    />
                  </div>
                )}

                {response.customer_name && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <Label>Nombre del cliente</Label>
                    </div>
                    <Input
                      value={response.customer_name}
                      readOnly
                    />
                  </div>
                )}

                {response.customer_email && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <Label>Email del cliente</Label>
                    </div>
                    <Input
                      value={response.customer_email}
                      readOnly
                    />
                  </div>
                )}

                {response.customer_phone && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <Label>Teléfono del cliente</Label>
                    </div>
                    <Input
                      value={response.customer_phone}
                      readOnly
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Respuestas detalladas */}
          <Card>
            <CardHeader>
              <CardTitle>Respuestas Detalladas</CardTitle>
            </CardHeader>
            <CardContent>
              {response.answers && response.answers.length > 0 ? (
                <div className="space-y-4">
                  {response.answers.map((answer) => (
                    <div key={answer.id} className="rounded-md border p-4">
                      <div className="mb-2 font-medium">{answer.question.question_text}</div>
                      <div className="text-gray-700">{renderAnswerValue(answer)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No hay respuestas disponibles.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">No se encontró la respuesta solicitada.</p>
          <Button
            className="mt-4"
            onClick={() => navigate('/admin/survey-responses')}
          >
            Volver a respuestas
          </Button>
        </div>
      )}
    </div>
  )
}
