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
// import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
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
  question_type: 'text_short' | 'text_long' | 'radio' | 'checkbox' | 'scale' | 'dropdown' | 'email' | 'phone' | 'name'
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
   * y la sección actual
   *
   * El progreso se calcula como el máximo entre:
   * 1. El porcentaje de descuento acumulativo de la sección actual
   * 2. El porcentaje de descuento acumulativo máximo entre las secciones completadas
   *
   * Esto permite mostrar al usuario cuánto descuento ha obtenido hasta el momento
   * y también refleja el progreso potencial al entrar en una nueva sección.
   */
  const calculateProgress = () => {
    if (!sections || sections.length === 0 || currentSectionIndex < 0) return 0

    // Obtener el porcentaje potencial de la sección actual
    const currentSectionPercentage = sections[currentSectionIndex]?.discount_percentage_cumulative ?? 0

    // Obtener el máximo porcentaje de las secciones ya completadas
    let maxCompletedPercentage = 0
    sections.forEach(section => {
      if (completedSections.includes(section.id)) {
        maxCompletedPercentage = Math.max(maxCompletedPercentage, section.discount_percentage_cumulative)
      }
    })

    // Devolver el máximo entre el actual y el completado
    return Math.max(currentSectionPercentage, maxCompletedPercentage)
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
   * Cada tipo de pregunta (texto corto, texto largo, opción única, opción múltiple, escala, etc.)
   * requiere un componente de input diferente. Esta función determina qué componente
   * usar y cómo configurarlo basándose en el tipo de pregunta y su configuración.
   *
   * @param question - La pregunta para la que se debe renderizar el input
   */
  const renderQuestionInput = (question: Question) => {
    const value = answers[question.id] || ''

    switch (question.question_type) {
      // Campos de texto corto, email, teléfono y nombre
      case 'text_short':
      case 'name':
        return (
          <Input
            value={value as string}
            onChange={(e) => handleAnswerChange(question.id, e.target.value, question)}
            required={question.is_required}
            placeholder="Tu respuesta"
            className="border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        )

      case 'email':
        return (
          <Input
            type="email"
            value={value as string}
            onChange={(e) => handleAnswerChange(question.id, e.target.value, question)}
            required={question.is_required}
            placeholder="correo@ejemplo.com"
            className="border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        )

      case 'phone':
        return (
          <Input
            type="tel"
            value={value as string}
            onChange={(e) => handleAnswerChange(question.id, e.target.value, question)}
            required={question.is_required}
            placeholder="Tu número de teléfono"
            className="border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        )

      // Campo de texto largo
      case 'text_long':
        return (
          <Textarea
            value={value as string}
            onChange={(e) => handleAnswerChange(question.id, e.target.value, question)}
            required={question.is_required}
            placeholder="Tu respuesta"
            className="min-h-[100px] border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        )

      // Opción única (Radio)
      case 'radio':
        const singleOptions = question.options || []
        if (!Array.isArray(singleOptions) || singleOptions.length === 0) {
          return (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error en la configuración</AlertTitle>
              <AlertDescription>Esta pregunta no tiene opciones configuradas correctamente.</AlertDescription>
            </Alert>
          )
        }

        return (
          <RadioGroup
            value={value as string}
            onValueChange={(val) => handleAnswerChange(question.id, val, question)}
            className="space-y-3"
          >
            {singleOptions.map((option: {value: string, label: string}, index: number) => (
              <div key={index} className="flex items-center space-x-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} className="h-5 w-5 border-gray-300 text-blue-600" />
                <Label htmlFor={`${question.id}-${option.value}`} className="w-full cursor-pointer text-gray-700">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )

      // Opción múltiple (Checkbox)
      case 'checkbox':
        const multipleOptions = question.options || []
        if (!Array.isArray(multipleOptions) || multipleOptions.length === 0) {
          return (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error en la configuración</AlertTitle>
              <AlertDescription>Esta pregunta no tiene opciones configuradas correctamente.</AlertDescription>
            </Alert>
          )
        }

        const selectedOptions = Array.isArray(value) ? value : []

        return (
          <div className="space-y-3">
            {multipleOptions.map((option: {value: string, label: string}, index: number) => {
              const isChecked = selectedOptions.includes(option.value)
              return (
                <div
                  key={index}
                  className={`flex items-center space-x-3 rounded-md border p-4 shadow-sm transition-colors cursor-pointer ${isChecked ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                >
                  <Checkbox
                    id={`${question.id}-${option.value}`}
                    checked={isChecked}
                    className="h-5 w-5 border-gray-300 text-blue-600"
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleAnswerChange(question.id, [...selectedOptions, option.value], question)
                      } else {
                        handleAnswerChange(
                          question.id,
                          selectedOptions.filter(item => item !== option.value),
                          question
                        )
                      }
                    }}
                  />
                  <Label
                    htmlFor={`${question.id}-${option.value}`}
                    className="w-full cursor-pointer text-gray-700"
                  >
                    {option.label}
                  </Label>
                </div>
              )
            })}
          </div>
        )

      // Escala numérica
      case 'scale':
        try {
          let scaleConfig = { min: 1, max: 5, labels: [] }

          if (question.options) {
            const parsedOptions = question.options
            if (typeof parsedOptions === 'object') {
              scaleConfig = {
                min: parsedOptions.min || 1,
                max: parsedOptions.max || 5,
                labels: parsedOptions.labels || []
              }
            }
          }

          const range = Array.from(
            { length: scaleConfig.max - scaleConfig.min + 1 },
            (_, i) => i + scaleConfig.min
          )

          return (
            <div className="py-2">
              <RadioGroup
                value={value as string}
                onValueChange={(val) => handleAnswerChange(question.id, val, question)}
                className="flex justify-between space-x-4 md:space-x-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                {range.map((rating) => (
                  <div key={rating} className="flex flex-col items-center">
                    <RadioGroupItem
                      value={rating.toString()}
                      id={`${question.id}-${rating}`}
                      className="h-8 w-8 md:h-10 md:w-10 border-2 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label
                      htmlFor={`${question.id}-${rating}`}
                      className="mt-2 cursor-pointer text-sm font-medium text-gray-700"
                    >
                      {rating}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {scaleConfig.labels && scaleConfig.labels.length >= 2 && (
                <div className="mt-2 flex justify-between px-4 text-xs font-medium text-gray-600">
                  <span>{scaleConfig.labels[0]}</span>
                  {scaleConfig.labels.length > 2 && (
                    <span>{scaleConfig.labels[Math.floor(scaleConfig.labels.length / 2)]}</span>
                  )}
                  <span>{scaleConfig.labels[scaleConfig.labels.length - 1]}</span>
                </div>
              )}
            </div>
          )
        } catch (error) {
          console.error('Error al parsear opciones de escala:', error)
          // Fallback a escala básica 1-5
          return (
            <div className="py-2">
              <RadioGroup
                value={value as string}
                onValueChange={(val) => handleAnswerChange(question.id, val, question)}
                className="flex justify-between space-x-4 md:space-x-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                {[1, 2, 3, 4, 5].map((rating) => (
                  <div key={rating} className="flex flex-col items-center">
                    <RadioGroupItem
                      value={rating.toString()}
                      id={`${question.id}-${rating}`}
                      className="h-8 w-8 md:h-10 md:w-10 border-2 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label
                      htmlFor={`${question.id}-${rating}`}
                      className="mt-2 cursor-pointer text-sm font-medium text-gray-700"
                    >
                      {rating}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <div className="mt-2 flex justify-between px-4 text-xs font-medium text-gray-600">
                <span>Muy bajo</span>
                <span>Muy alto</span>
              </div>
            </div>
          )
        }

      // Lista desplegable (Dropdown)
      case 'dropdown':
        try {
          const options = question.options || []
          if (!Array.isArray(options) || options.length === 0) {
            return (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error en la configuración</AlertTitle>
                <AlertDescription>Esta pregunta no tiene opciones configuradas correctamente.</AlertDescription>
              </Alert>
            )
          }

          return (
            <Select
              value={value as string}
              onValueChange={(val) => handleAnswerChange(question.id, val, question)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option: {value: string, label: string}, index: number) => (
                  <SelectItem key={index} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        } catch (error) {
          console.error('Error al parsear opciones de dropdown:', error)
          return (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error en la configuración</AlertTitle>
              <AlertDescription>Esta pregunta tiene un formato de opciones inválido.</AlertDescription>
            </Alert>
          )
        }

      // Tipo de pregunta no reconocido
      default:
        console.warn(`Tipo de pregunta no soportado: ${question.question_type}`)
        return (
          <Input
            value={value as string}
            onChange={(e) => handleAnswerChange(question.id, e.target.value, question)}
            placeholder="Tu respuesta"
            className="border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        )
    }
  }

  // Renderizar según el estado de la página
  const renderContent = () => {
    switch (pageState) {
      case 'loading':
        return (
          <Card className="mx-auto w-full max-w-md overflow-hidden border-none shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-center text-xl text-gray-800">Cargando encuesta...</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center py-8">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
            </CardContent>
          </Card>
        )

      case 'not-found':
        return (
          <Card className="mx-auto w-full max-w-md overflow-hidden border-none shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-center text-xl text-gray-800">Encuesta no encontrada</CardTitle>
            </CardHeader>
            <CardContent className="px-8 py-6">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <AlertCircle className="h-16 w-16 text-amber-500" />
                <p className="text-gray-600">
                  La encuesta que estás buscando no existe o no está activa.
                </p>
              </div>
            </CardContent>
          </Card>
        )

      case 'code-required':
        return (
          <Card className="mx-auto w-full max-w-md overflow-hidden border-none shadow-xl">
            <CardHeader className="space-y-3 pb-4">
              <CardTitle className="text-center text-2xl md:text-3xl text-gray-800">{survey?.name}</CardTitle>
              <CardDescription className="text-center mb-4">
                Para acceder a esta encuesta, por favor ingresa el código de producto.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-8 pt-4 md:p-8">
              {error && (
                <Alert variant="destructive" className="mb-6 border border-red-200 bg-red-50 text-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="font-medium">Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(validateProductCode)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="codeValue"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-gray-700">Código de Producto</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ingresa el código de producto"
                            className="h-11 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </FormControl>
                        <FormDescription className="text-sm text-gray-500">
                          El código se encuentra en el producto o en el recibo de compra.
                        </FormDescription>
                        <FormMessage className="font-medium text-red-500" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="mt-2 h-11 w-full bg-blue-600 font-medium shadow-sm hover:bg-blue-700 focus:ring-blue-500"
                    disabled={validatingCode}
                  >
                    {validatingCode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        Continuar
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
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
            <Card className="mx-auto w-full max-w-3xl overflow-hidden border-none shadow-2xl">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="text-xl text-gray-800">{survey?.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center space-x-3 py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
                <span className="text-gray-600">Cargando secciones y preguntas...</span>
              </CardContent>
            </Card>
          )
        }

        // Obtener la sección actual
        const currentSection = sections[currentSectionIndex]
        if (!currentSection) {
          return (
            <Card className="mx-auto w-full max-w-3xl overflow-hidden border-none shadow-2xl">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="text-xl text-gray-800">{survey?.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Alert variant="destructive" className="border border-red-200 bg-red-50 text-red-800">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <AlertTitle className="font-medium">Error</AlertTitle>
                  <AlertDescription>No se encontró la sección actual.</AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )
        }

        // Calcular el progreso
        const progress = calculateProgress()

        return (
          <Card className="mx-auto w-full max-w-3xl overflow-hidden border-none shadow-2xl">
            <CardHeader className="border-b border-gray-100 pb-4 text-center">
              <CardTitle className="text-2xl md:text-3xl text-gray-800">{survey?.name}</CardTitle>
              {survey?.description && (
                <CardDescription className="mt-2 mb-4 text-gray-600">
                  {survey.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-8 p-6 md:p-8">
              {/* Barra de progreso */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-700">Progreso</span>
                  <span className="text-blue-600">{progress}%</span>
                </div>
                <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full w-full flex-1 bg-blue-600 rounded-full transition-all"
                    style={{ transform: `translateX(-${100 - progress}%)` }}
                  />
                </div>
              </div>

              {/* Título y descripción de la sección */}
              <div className="space-y-2 rounded-lg bg-blue-50 p-5">
                <h2 className="text-lg md:text-xl font-semibold text-gray-800">{currentSection.title}</h2>
                {currentSection.description && (
                  <p className="text-gray-600">{currentSection.description}</p>
                )}
              </div>

              {/* Mensaje de validación */}
              {validationError && (
                <Alert variant="destructive" className="border border-red-200 bg-red-50 text-red-800">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <AlertTitle className="font-medium">Error de validación</AlertTitle>
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              {/* Preguntas */}
              <div className="space-y-8">
                {currentSection.questions.map((question, index) => (
                  <div key={question.id} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm mb-6">
                    <div className="flex items-center gap-1">
                      <label className="font-medium text-gray-800">
                        {index + 1}. {question.question_text}
                        {question.is_required && <span className="ml-1 text-red-500">*</span>}
                      </label>
                    </div>
                    <div className="pl-5">
                      {renderQuestionInput(question)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center border-t border-gray-100 bg-gray-50 px-6 py-4 md:px-8 md:py-5">
              <Button
                variant="outline"
                onClick={goToPreviousSection}
                disabled={currentSectionIndex === 0}
                className="border-gray-300 bg-white shadow-sm hover:bg-gray-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Sección Anterior
              </Button>

              <div className="flex gap-3">
                {completedSections.length > 0 && (
                  <Button
                    onClick={finalizeSurvey}
                    disabled={finalizing}
                    className="bg-green-600 font-medium text-white shadow-sm hover:bg-green-700"
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
                  className="bg-blue-600 font-medium text-white shadow-sm hover:bg-blue-700"
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
            <Card className="mx-auto w-full max-w-md overflow-hidden border-none shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-center text-xl text-gray-800">Error</CardTitle>
              </CardHeader>
              <CardContent className="px-6 py-4">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                  <AlertCircle className="h-16 w-16 text-amber-500" />
                  <p className="text-gray-600">
                    No se encontraron datos de finalización.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center border-t border-gray-100 bg-gray-50 p-4">
                <Button
                  onClick={() => setPageState('survey-display')}
                  className="bg-blue-600 font-medium shadow-sm hover:bg-blue-700"
                >
                  Volver a la encuesta
                </Button>
              </CardFooter>
            </Card>
          )
        }

        return (
          <Card className="mx-auto w-full max-w-md overflow-hidden border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 pb-6 pt-8">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-white p-3 shadow-md">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-center text-2xl font-bold text-green-700">¡Gracias por completar la encuesta!</CardTitle>
              <CardDescription className="text-center text-green-600">
                Tu opinión es muy valiosa para nosotros.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6 md:p-8">
              <Alert variant="success" className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertTitle className="font-semibold">Descuento obtenido: {completionData.discount_percentage}%</AlertTitle>
                <AlertDescription>
                  Has obtenido un descuento del {completionData.discount_percentage}% para tu próxima compra.
                </AlertDescription>
              </Alert>

              <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                <div className="border-b border-gray-200 bg-gray-50 p-3">
                  <div className="text-sm font-medium text-gray-700">Tu código de descuento:</div>
                </div>
                <div className="flex items-center justify-between bg-white p-4">
                  <code className="font-mono text-xl font-bold text-blue-700">{completionData.discount_code}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyDiscountCode}
                    className={`flex items-center gap-1.5 ${copySuccess ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'border-gray-300'}`}
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
                <div className="border-t border-gray-200 bg-gray-50 p-3">
                  <div className="text-sm text-gray-600">
                    Válido hasta: {format(new Date(completionData.valid_until), 'dd/MM/yyyy', { locale: es })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:py-14 md:py-16">
      <div className="mx-auto max-w-3xl w-full">
        {renderContent()}
      </div>
    </div>
  )
}
