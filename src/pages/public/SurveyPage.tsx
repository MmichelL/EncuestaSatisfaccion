import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { AlertCircle, CheckCircle, ArrowRight, ArrowLeft, AlertTriangle, Copy, Check, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { useSurveyProgress } from '@/hooks/useSurveyProgress'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
type PageState = 'loading' | 'not-found' | 'code-required' | 'survey-display' | 'survey-completed'

// Interfaces para los datos de la encuesta
interface Question {
  id: string
  section_id: string
  question_text: string
  question_type: 'text' | 'textarea' | 'single_choice' | 'multiple_choice' | 'rating' | 'scale'
  options: string | null
  is_required: boolean
  question_order: number
}

interface Section {
  id: string
  survey_id: string
  title: string
  description: string | null
  section_order: number
  discount_percentage_cumulative: number
  questions: Question[]
}

interface Survey {
  id: string
  name: string
  description: string | null
  slug: string
  is_active: boolean
  requires_product_code: boolean
}

// Tipo para las respuestas
type AnswersMap = Record<string, string | string[]>

// Interfaz para los datos de finalización
interface CompletionData {
  discount_code: string
  valid_until: string
  discount_percentage: number
}

/**
 * Página pública para mostrar y responder una encuesta
 */
export default function SurveyPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [error, setError] = useState<string | null>(null)
  const [validatingCode, setValidatingCode] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [savingAnswer, setSavingAnswer] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [completionData, setCompletionData] = useState<CompletionData | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  // Usar el hook personalizado para gestionar el progreso
  const {
    currentSectionIndex,
    answers,
    responseId,
    completedSections,
    productCodeId,
    setCurrentSectionIndex,
    updateAnswer,
    setResponseId,
    addCompletedSection,
    setProductCodeId,
    clearProgress
  } = useSurveyProgress(slug)

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
          // Si no requiere código, cargar las secciones y preguntas
          await fetchSectionsAndQuestions(data.id)
          setPageState('survey-display')
        }
      } catch (error) {
        console.error('Error al cargar la encuesta:', error)
        setPageState('not-found')
      }
    }

    fetchSurvey()
  }, [slug])

  // Cargar las secciones y preguntas de la encuesta
  const fetchSectionsAndQuestions = async (surveyId: string) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('survey_sections')
        .select('*, questions(*)')
        .eq('survey_id', surveyId)
        .order('section_order')
        .order('question_order', { foreignTable: 'questions' })

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('No se encontraron secciones para esta encuesta')
      }

      setSections(data)
    } catch (error: any) {
      console.error('Error al cargar las secciones y preguntas:', error)
      setError(error.message || 'Error al cargar las secciones y preguntas. Por favor, intenta de nuevo.')
    }
  }

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
        // Guardar el ID del código validado
        setProductCodeId(responseData.codeId)

        // Cargar las secciones y preguntas
        await fetchSectionsAndQuestions(survey.id)

        // Cambiar al estado de mostrar la encuesta
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

  // Guardar una respuesta en la base de datos
  const saveAnswer = async (questionId: string, value: string | string[], question: Question) => {
    if (!survey) return

    try {
      setSavingAnswer(true)
      setError(null)

      // Si no hay responseId, crear primero el registro de respuesta
      if (!responseId) {
        const { data, error } = await supabase
          .from('survey_responses')
          .insert({
            survey_id: survey.id,
            product_code_id: productCodeId,
            status: 'in_progress',
            start_time: new Date().toISOString()
          })
          .select('id')
          .single()

        if (error) throw error

        if (data) {
          setResponseId(data.id)
        } else {
          throw new Error('No se pudo crear el registro de respuesta')
        }
      }

      // Guardar la respuesta individual
      const { error } = await supabase
        .from('answers')
        .upsert({
          response_id: responseId,
          question_id: questionId,
          answer_value: typeof value === 'string' ? value : JSON.stringify(value),
          question_text_at_response: question.question_text,
          question_type_at_response: question.question_type
        })

      if (error) throw error

    } catch (error: any) {
      console.error('Error al guardar la respuesta:', error)
      // No mostrar el error al usuario para no interrumpir la experiencia
      // Solo registrar en consola
    } finally {
      setSavingAnswer(false)
    }
  }

  // Actualizar el último ID de sección guardado
  const updateLastSavedSection = async (sectionId: string) => {
    if (!responseId || !survey) return

    try {
      const { error } = await supabase
        .from('survey_responses')
        .update({ last_saved_section_id: sectionId })
        .eq('id', responseId)

      if (error) throw error
    } catch (error) {
      console.error('Error al actualizar la última sección guardada:', error)
    }
  }

  // Finalizar la encuesta
  const finalizeSurvey = async () => {
    if (!responseId || !survey) return

    try {
      setFinalizing(true)
      setError(null)

      // Llamar a la Edge Function para finalizar la respuesta
      const { data: responseData, error } = await supabase.functions.invoke('finalize-survey-response', {
        body: { responseId }
      })

      if (error) throw error

      if (responseData.success) {
        // Limpiar el progreso guardado
        clearProgress()

        // Guardar los datos de finalización
        setCompletionData(responseData.data)

        // Cambiar al estado de encuesta completada
        setPageState('survey-completed')
      } else {
        throw new Error(responseData.error || 'Error al finalizar la encuesta')
      }
    } catch (error: any) {
      console.error('Error al finalizar la encuesta:', error)
      setError(`Error al finalizar la encuesta: ${error.message || 'Intenta de nuevo'}`)
    } finally {
      setFinalizing(false)
    }
  }

  // Copiar el código de descuento al portapapeles
  const copyDiscountCode = () => {
    if (!completionData) return

    navigator.clipboard.writeText(completionData.discount_code)
      .then(() => {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      })
      .catch(err => {
        console.error('Error al copiar el código:', err)
      })
  }

  // Manejar el cambio de respuesta
  const handleAnswerChange = async (questionId: string, value: string | string[], question: Question) => {
    // Actualizar el estado local
    updateAnswer(questionId, value)

    // Guardar en la base de datos
    await saveAnswer(questionId, value, question)
  }

  /**
   * Calcula el porcentaje de progreso de la encuesta basado en las secciones completadas
   *
   * El progreso se calcula encontrando el porcentaje de descuento acumulativo máximo
   * entre todas las secciones que el usuario ha completado. Esto permite mostrar
   * al usuario cuánto descuento ha obtenido hasta el momento.
   */
  const calculateProgress = () => {
    if (!sections || sections.length === 0) return 0

    // Si no hay secciones completadas, devolver 0
    if (completedSections.length === 0) return 0

    // Encontrar el porcentaje de descuento acumulativo máximo entre las secciones completadas
    let maxDiscount = 0
    sections.forEach(section => {
      if (completedSections.includes(section.id)) {
        maxDiscount = Math.max(maxDiscount, section.discount_percentage_cumulative)
      }
    })

    return maxDiscount
  }

  // Navegar a la sección anterior
  const goToPreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1)
      setValidationError(null)
    }
  }

  /**
   * Navega a la siguiente sección de la encuesta
   *
   * Antes de avanzar, valida que todas las preguntas requeridas tengan respuesta.
   * Si la validación es exitosa, marca la sección actual como completada,
   * actualiza la última sección guardada en la base de datos y avanza a la siguiente sección.
   */
  const goToNextSection = async () => {
    if (!sections || currentSectionIndex >= sections.length - 1) return

    // Validar que todas las preguntas requeridas tengan respuesta
    const currentSection = sections[currentSectionIndex]
    const requiredQuestions = currentSection.questions.filter(q => q.is_required)

    const unansweredQuestions = requiredQuestions.filter(q => {
      const answer = answers[q.id]
      return answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)
    })

    if (unansweredQuestions.length > 0) {
      setValidationError(`Por favor, responde todas las preguntas obligatorias antes de continuar.`)
      return
    }

    // Marcar la sección como completada
    addCompletedSection(currentSection.id)

    // Actualizar la última sección guardada en la base de datos
    if (responseId) {
      await updateLastSavedSection(currentSection.id)
    }

    // Avanzar a la siguiente sección
    setCurrentSectionIndex(currentSectionIndex + 1)
    setValidationError(null)
  }

  /**
   * Renderiza el componente de input adecuado según el tipo de pregunta
   *
   * Cada tipo de pregunta (texto, textarea, opción única, opción múltiple, escala)
   * requiere un componente de input diferente. Esta función determina qué componente
   * usar y cómo configurarlo basándose en el tipo de pregunta y su configuración.
   *
   * @param question - La pregunta para la que se debe renderizar el input
   */
  const renderQuestionInput = (question: Question) => {
    const value = answers[question.id] || ''

    switch (question.question_type) {
      case 'text':
        return (
          <Input
            value={value as string}
            onChange={(e) => handleAnswerChange(question.id, e.target.value, question)}
            required={question.is_required}
            placeholder="Tu respuesta"
          />
        )

      case 'textarea':
        return (
          <Textarea
            value={value as string}
            onChange={(e) => handleAnswerChange(question.id, e.target.value, question)}
            required={question.is_required}
            placeholder="Tu respuesta"
          />
        )

      case 'single_choice':
        const singleOptions = question.options ? JSON.parse(question.options) : []
        return (
          <RadioGroup
            value={value as string}
            onValueChange={(val) => handleAnswerChange(question.id, val, question)}
            className="space-y-2"
          >
            {singleOptions.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                <label htmlFor={`${question.id}-${index}`} className="text-sm font-medium">
                  {option}
                </label>
              </div>
            ))}
          </RadioGroup>
        )

      case 'multiple_choice':
        const multipleOptions = question.options ? JSON.parse(question.options) : []
        const selectedOptions = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {multipleOptions.map((option: string, index: number) => {
              const isChecked = selectedOptions.includes(option)
              return (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.id}-${index}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleAnswerChange(question.id, [...selectedOptions, option], question)
                      } else {
                        handleAnswerChange(
                          question.id,
                          selectedOptions.filter(item => item !== option),
                          question
                        )
                      }
                    }}
                  />
                  <label
                    htmlFor={`${question.id}-${index}`}
                    className="text-sm font-medium"
                  >
                    {option}
                  </label>
                </div>
              )
            })}
          </div>
        )

      case 'rating':
      case 'scale':
        const maxRating = 5
        return (
          <RadioGroup
            value={value as string}
            onValueChange={(val) => handleAnswerChange(question.id, val, question)}
            className="flex space-x-4"
          >
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
              <div key={rating} className="flex flex-col items-center">
                <RadioGroupItem value={rating.toString()} id={`${question.id}-${rating}`} />
                <label htmlFor={`${question.id}-${rating}`} className="mt-1 text-sm">
                  {rating}
                </label>
              </div>
            ))}
          </RadioGroup>
        )

      default:
        return <Input placeholder="Tu respuesta" />
    }
  }

  // Renderizar según el estado de la página
  const renderContent = () => {
    switch (pageState) {
      case 'loading':
        return (
          <Card className="w-full max-w-[95%] sm:max-w-md mx-auto">
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
          <Card className="w-full max-w-[95%] sm:max-w-md mx-auto">
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
          <Card className="w-full max-w-[95%] sm:max-w-md mx-auto">
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
        // Si no hay secciones, mostrar mensaje de carga
        if (!sections || sections.length === 0) {
          return (
            <Card className="w-full max-w-[95%] sm:max-w-2xl md:max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle>{survey?.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center py-6">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
                <span className="ml-2">Cargando secciones y preguntas...</span>
              </CardContent>
            </Card>
          )
        }

        // Obtener la sección actual
        const currentSection = sections[currentSectionIndex]
        if (!currentSection) {
          return (
            <Card className="w-full max-w-[95%] sm:max-w-2xl md:max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle>{survey?.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>No se encontró la sección actual.</AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )
        }

        // Calcular el progreso
        const progress = calculateProgress()

        return (
          <Card className="w-full max-w-[95%] sm:max-w-2xl md:max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>{survey?.name}</CardTitle>
              <CardDescription>
                {survey?.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Barra de progreso */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progreso</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Título y descripción de la sección */}
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">{currentSection.title}</h2>
                {currentSection.description && (
                  <p className="text-gray-500">{currentSection.description}</p>
                )}
              </div>

              {/* Mensaje de validación */}
              {validationError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error de validación</AlertTitle>
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              {/* Preguntas */}
              <div className="space-y-6">
                {currentSection.questions.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <div className="flex items-center gap-1">
                      <label className="font-medium">
                        {question.question_text}
                        {question.is_required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    </div>
                    {renderQuestionInput(question)}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={goToPreviousSection}
                disabled={currentSectionIndex === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Sección Anterior
              </Button>

              <div className="flex gap-2">
                {completedSections.length > 0 && (
                  <Button
                    onClick={finalizeSurvey}
                    disabled={finalizing}
                    variant="success"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {finalizing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Finalizando...
                      </>
                    ) : (
                      <>Finalizar Encuesta</>
                    )}
                  </Button>
                )}

                <Button
                  onClick={goToNextSection}
                  disabled={currentSectionIndex >= sections.length - 1}
                >
                  Siguiente Sección
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        )

      case 'survey-completed':
        if (!completionData) {
          return (
            <Card className="w-full max-w-[95%] sm:max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-center">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500">
                  No se encontraron datos de finalización.
                </p>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button onClick={() => setPageState('survey-display')}>
                  Volver a la encuesta
                </Button>
              </CardFooter>
            </Card>
          )
        }

        return (
          <Card className="w-full max-w-[95%] sm:max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center text-green-600">¡Gracias por completar la encuesta!</CardTitle>
              <CardDescription className="text-center">
                Tu opinión es muy valiosa para nosotros.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant="success" className="bg-green-50 text-green-800 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Descuento obtenido: {completionData.discount_percentage}%</AlertTitle>
                <AlertDescription>
                  Has obtenido un descuento del {completionData.discount_percentage}% para tu próxima compra.
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border p-4 bg-gray-50">
                <div className="text-sm text-gray-500 mb-2">Tu código de descuento:</div>
                <div className="flex items-center justify-between bg-white rounded border p-3">
                  <code className="font-mono text-lg font-bold">{completionData.discount_code}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyDiscountCode}
                    className="flex items-center gap-1"
                  >
                    {copySuccess ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copiar</span>
                      </>
                    )}
                  </Button>
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Válido hasta: {format(new Date(completionData.valid_until), 'dd/MM/yyyy', { locale: es })}
                </div>
              </div>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <div className="container mx-auto py-4 px-4 sm:py-6 md:py-8">
      <div className="max-w-3xl mx-auto">
        {renderContent()}
      </div>
    </div>
  )
}
