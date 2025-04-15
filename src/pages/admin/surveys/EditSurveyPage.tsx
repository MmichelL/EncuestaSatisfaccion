import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Trash2,
  Edit,
  Plus,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash,
  GripVertical,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import SurveyForm, { SurveyFormValues } from '@/components/admin/surveys/SurveyForm'
import SectionForm, { SectionFormValues } from '@/components/admin/surveys/SectionForm'
import QuestionForm, { QuestionFormValues } from '@/components/admin/surveys/QuestionForm'
import { supabase } from '@/lib/supabaseClient'

// Interfaces para los datos
interface SurveySection {
  id: string
  survey_id: string
  title: string
  description: string | null
  section_order: number
  discount_percentage_cumulative: number
  questions: Question[]
}

interface Question {
  id: string
  section_id: string
  question_text: string
  question_type: string
  options: string | null
  is_required: boolean
  question_order: number
}

interface CodeBatch {
  id: string
  name: string
}

interface SurveyCodeBatch {
  survey_id: string
  batch_id: string
}

/**
 * Página para editar una encuesta existente
 */
export default function EditSurveyPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [survey, setSurvey] = useState<SurveyFormValues | null>(null)
  const [sections, setSections] = useState<SurveySection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estados para los lotes de códigos
  const [codeBatches, setCodeBatches] = useState<CodeBatch[]>([])
  const [linkedBatchIds, setLinkedBatchIds] = useState<string[]>([])
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [batchError, setBatchError] = useState<string | null>(null)
  const [savingBatches, setSavingBatches] = useState(false)

  // Estados para los formularios modales
  const [sectionFormOpen, setSectionFormOpen] = useState(false)
  const [currentSection, setCurrentSection] = useState<(SectionFormValues & { id?: string }) | null>(null)
  const [questionFormOpen, setQuestionFormOpen] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<(QuestionFormValues & { id?: string, section_id: string }) | null>(null)

  // Cargar los datos de la encuesta, secciones y preguntas
  useEffect(() => {
    const fetchSurveyData = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)

        // Obtener datos de la encuesta
        const { data: surveyData, error: surveyError } = await supabase
          .from('surveys')
          .select('*')
          .eq('id', id)
          .single()

        if (surveyError) throw surveyError
        if (!surveyData) throw new Error('Encuesta no encontrada')

        setSurvey(surveyData)

        // Obtener secciones y preguntas
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('survey_sections')
          .select('*, questions(*)')
          .eq('survey_id', id)
          .order('section_order')

        if (sectionsError) throw sectionsError

        // Ordenar las preguntas dentro de cada sección
        const sectionsWithSortedQuestions = sectionsData.map((section: any) => ({
          ...section,
          questions: section.questions.sort((a: Question, b: Question) => a.question_order - b.question_order),
        }))

        setSections(sectionsWithSortedQuestions)

        // Si la encuesta requiere código de producto, cargar los lotes de códigos
        if (surveyData.requires_product_code) {
          await fetchCodeBatches(id)
        }
      } catch (error) {
        console.error('Error al cargar los datos de la encuesta:', error)
        setError('No se pudieron cargar los datos de la encuesta. Por favor, intenta de nuevo.')
      } finally {
        setLoading(false)
      }
    }

    fetchSurveyData()
  }, [id])

  // Cargar los lotes de códigos disponibles y los vinculados a la encuesta
  const fetchCodeBatches = async (surveyId: string) => {
    try {
      setLoadingBatches(true)
      setBatchError(null)

      // Obtener todos los lotes de códigos disponibles
      const { data: batchesData, error: batchesError } = await supabase
        .from('code_batches')
        .select('id, name')
        .order('name')

      if (batchesError) throw batchesError

      setCodeBatches(batchesData || [])

      // Obtener los IDs de los lotes vinculados a esta encuesta
      const { data: linkedData, error: linkedError } = await supabase
        .from('survey_code_batches')
        .select('batch_id')
        .eq('survey_id', surveyId)

      if (linkedError) throw linkedError

      const linkedIds = linkedData.map((item: { batch_id: string }) => item.batch_id)
      setLinkedBatchIds(linkedIds)
      setSelectedBatchIds(linkedIds)
    } catch (error) {
      console.error('Error al cargar los lotes de códigos:', error)
      setBatchError('No se pudieron cargar los lotes de códigos. Por favor, intenta de nuevo.')
    } finally {
      setLoadingBatches(false)
    }
  }

  // Guardar las vinculaciones de lotes de códigos
  const saveCodeBatchLinks = async () => {
    if (!id) return

    try {
      setSavingBatches(true)
      setBatchError(null)

      // Calcular qué vinculaciones hay que añadir
      const batchesToAdd = selectedBatchIds.filter(batchId => !linkedBatchIds.includes(batchId))

      // Calcular qué vinculaciones hay que quitar
      const batchesToRemove = linkedBatchIds.filter(batchId => !selectedBatchIds.includes(batchId))

      // Añadir nuevas vinculaciones
      if (batchesToAdd.length > 0) {
        const newLinks = batchesToAdd.map(batchId => ({
          survey_id: id,
          batch_id: batchId
        }))

        const { error: addError } = await supabase
          .from('survey_code_batches')
          .insert(newLinks)

        if (addError) throw addError
      }

      // Eliminar vinculaciones
      if (batchesToRemove.length > 0) {
        for (const batchId of batchesToRemove) {
          const { error: removeError } = await supabase
            .from('survey_code_batches')
            .delete()
            .eq('survey_id', id)
            .eq('batch_id', batchId)

          if (removeError) throw removeError
        }
      }

      // Actualizar el estado local
      setLinkedBatchIds([...selectedBatchIds])

      // Mostrar mensaje de éxito
      alert('Vinculaciones de lotes guardadas exitosamente')
    } catch (error) {
      console.error('Error al guardar las vinculaciones de lotes:', error)
      setBatchError('No se pudieron guardar las vinculaciones. Por favor, intenta de nuevo.')
    } finally {
      setSavingBatches(false)
    }
  }

  // Manejar la actualización de la encuesta
  const handleUpdate = async (data: SurveyFormValues) => {
    if (!id) return

    try {
      setIsSubmitting(true)
      setError(null)

      // Actualizar la encuesta en Supabase
      const { error } = await supabase
        .from('surveys')
        .update(data)
        .eq('id', id)

      if (error) throw error

      // Verificar si cambió el valor de requires_product_code
      const requiresCodeChanged = survey?.requires_product_code !== data.requires_product_code

      setSurvey(data)

      // Si ahora requiere código de producto y antes no, cargar los lotes de códigos
      if (requiresCodeChanged && data.requires_product_code) {
        await fetchCodeBatches(id)
      }

      // Mostrar mensaje de éxito
      alert('Encuesta actualizada exitosamente')
    } catch (error) {
      console.error('Error al actualizar la encuesta:', error)
      setError('No se pudo actualizar la encuesta. Por favor, intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Manejar la eliminación de la encuesta
  const handleDelete = async () => {
    if (!id) return

    try {
      setIsSubmitting(true)
      setError(null)

      // Eliminar la encuesta de Supabase
      const { error } = await supabase
        .from('surveys')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Redirigir a la página de listado de encuestas
      navigate('/admin/surveys', {
        state: {
          message: 'Encuesta eliminada exitosamente',
          type: 'success',
        },
      })
    } catch (error) {
      console.error('Error al eliminar la encuesta:', error)
      setError('No se pudo eliminar la encuesta. Por favor, intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Funciones para gestionar secciones
  const handleCreateSection = async (data: SectionFormValues) => {
    if (!id) return

    try {
      setIsSubmitting(true)
      setError(null)

      // Insertar la nueva sección en Supabase
      const { data: newSection, error } = await supabase
        .from('survey_sections')
        .insert([
          {
            ...data,
            survey_id: id,
          },
        ])
        .select()

      if (error) throw error

      // Recargar las secciones
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('survey_sections')
        .select('*, questions(*)')
        .eq('survey_id', id)
        .order('section_order')

      if (sectionsError) throw sectionsError

      // Ordenar las preguntas dentro de cada sección
      const sectionsWithSortedQuestions = sectionsData.map((section: any) => ({
        ...section,
        questions: section.questions.sort((a: Question, b: Question) => a.question_order - b.question_order),
      }))

      setSections(sectionsWithSortedQuestions)
    } catch (error) {
      console.error('Error al crear la sección:', error)
      setError('No se pudo crear la sección. Por favor, intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateSection = async (data: SectionFormValues) => {
    if (!currentSection?.id) return

    try {
      setIsSubmitting(true)
      setError(null)

      // Actualizar la sección en Supabase
      const { error } = await supabase
        .from('survey_sections')
        .update(data)
        .eq('id', currentSection.id)

      if (error) throw error

      // Recargar las secciones
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('survey_sections')
        .select('*, questions(*)')
        .eq('survey_id', id)
        .order('section_order')

      if (sectionsError) throw sectionsError

      // Ordenar las preguntas dentro de cada sección
      const sectionsWithSortedQuestions = sectionsData.map((section: any) => ({
        ...section,
        questions: section.questions.sort((a: Question, b: Question) => a.question_order - b.question_order),
      }))

      setSections(sectionsWithSortedQuestions)
    } catch (error) {
      console.error('Error al actualizar la sección:', error)
      setError('No se pudo actualizar la sección. Por favor, intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Eliminar la sección de Supabase
      const { error } = await supabase
        .from('survey_sections')
        .delete()
        .eq('id', sectionId)

      if (error) throw error

      // Actualizar el estado local
      setSections(sections.filter((section) => section.id !== sectionId))
    } catch (error) {
      console.error('Error al eliminar la sección:', error)
      setError('No se pudo eliminar la sección. Por favor, intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMoveSection = async (sectionId: string, direction: 'up' | 'down') => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Encontrar la sección actual y la adyacente
      const currentIndex = sections.findIndex((section) => section.id === sectionId)
      if (currentIndex === -1) return

      const currentSection = sections[currentIndex]

      // Determinar el índice de la sección adyacente
      const adjacentIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

      // Verificar si el movimiento es válido
      if (adjacentIndex < 0 || adjacentIndex >= sections.length) return

      const adjacentSection = sections[adjacentIndex]

      // Intercambiar los órdenes
      const { error: error1 } = await supabase
        .from('survey_sections')
        .update({ section_order: adjacentSection.section_order })
        .eq('id', currentSection.id)

      if (error1) throw error1

      const { error: error2 } = await supabase
        .from('survey_sections')
        .update({ section_order: currentSection.section_order })
        .eq('id', adjacentSection.id)

      if (error2) throw error2

      // Recargar las secciones
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('survey_sections')
        .select('*, questions(*)')
        .eq('survey_id', id)
        .order('section_order')

      if (sectionsError) throw sectionsError

      // Ordenar las preguntas dentro de cada sección
      const sectionsWithSortedQuestions = sectionsData.map((section: any) => ({
        ...section,
        questions: section.questions.sort((a: Question, b: Question) => a.question_order - b.question_order),
      }))

      setSections(sectionsWithSortedQuestions)
    } catch (error) {
      console.error('Error al mover la sección:', error)
      setError('No se pudo mover la sección. Por favor, intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Funciones para gestionar preguntas
  const handleCreateQuestion = async (data: QuestionFormValues) => {
    if (!currentQuestion?.section_id) return

    try {
      setIsSubmitting(true)
      setError(null)

      // Insertar la nueva pregunta en Supabase
      const { data: newQuestion, error } = await supabase
        .from('questions')
        .insert([
          {
            ...data,
            section_id: currentQuestion.section_id,
          },
        ])
        .select()

      if (error) throw error

      // Recargar las secciones y preguntas
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('survey_sections')
        .select('*, questions(*)')
        .eq('survey_id', id)
        .order('section_order')

      if (sectionsError) throw sectionsError

      // Ordenar las preguntas dentro de cada sección
      const sectionsWithSortedQuestions = sectionsData.map((section: any) => ({
        ...section,
        questions: section.questions.sort((a: Question, b: Question) => a.question_order - b.question_order),
      }))

      setSections(sectionsWithSortedQuestions)
    } catch (error) {
      console.error('Error al crear la pregunta:', error)
      setError('No se pudo crear la pregunta. Por favor, intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateQuestion = async (data: QuestionFormValues) => {
    if (!currentQuestion?.id) return

    try {
      setIsSubmitting(true)
      setError(null)

      // Actualizar la pregunta en Supabase
      const { error } = await supabase
        .from('questions')
        .update(data)
        .eq('id', currentQuestion.id)

      if (error) throw error

      // Recargar las secciones y preguntas
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('survey_sections')
        .select('*, questions(*)')
        .eq('survey_id', id)
        .order('section_order')

      if (sectionsError) throw sectionsError

      // Ordenar las preguntas dentro de cada sección
      const sectionsWithSortedQuestions = sectionsData.map((section: any) => ({
        ...section,
        questions: section.questions.sort((a: Question, b: Question) => a.question_order - b.question_order),
      }))

      setSections(sectionsWithSortedQuestions)
    } catch (error) {
      console.error('Error al actualizar la pregunta:', error)
      setError('No se pudo actualizar la pregunta. Por favor, intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Eliminar la pregunta de Supabase
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId)

      if (error) throw error

      // Actualizar el estado local
      setSections(
        sections.map((section) => ({
          ...section,
          questions: section.questions.filter((question) => question.id !== questionId),
        }))
      )
    } catch (error) {
      console.error('Error al eliminar la pregunta:', error)
      setError('No se pudo eliminar la pregunta. Por favor, intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMoveQuestion = async (questionId: string, sectionId: string, direction: 'up' | 'down') => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Encontrar la sección
      const section = sections.find((s) => s.id === sectionId)
      if (!section) return

      // Encontrar la pregunta actual y la adyacente
      const currentIndex = section.questions.findIndex((q) => q.id === questionId)
      if (currentIndex === -1) return

      const currentQuestion = section.questions[currentIndex]

      // Determinar el índice de la pregunta adyacente
      const adjacentIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

      // Verificar si el movimiento es válido
      if (adjacentIndex < 0 || adjacentIndex >= section.questions.length) return

      const adjacentQuestion = section.questions[adjacentIndex]

      // Intercambiar los órdenes
      const { error: error1 } = await supabase
        .from('questions')
        .update({ question_order: adjacentQuestion.question_order })
        .eq('id', currentQuestion.id)

      if (error1) throw error1

      const { error: error2 } = await supabase
        .from('questions')
        .update({ question_order: currentQuestion.question_order })
        .eq('id', adjacentQuestion.id)

      if (error2) throw error2

      // Recargar las secciones y preguntas
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('survey_sections')
        .select('*, questions(*)')
        .eq('survey_id', id)
        .order('section_order')

      if (sectionsError) throw sectionsError

      // Ordenar las preguntas dentro de cada sección
      const sectionsWithSortedQuestions = sectionsData.map((section: any) => ({
        ...section,
        questions: section.questions.sort((a: Question, b: Question) => a.question_order - b.question_order),
      }))

      setSections(sectionsWithSortedQuestions)
    } catch (error) {
      console.error('Error al mover la pregunta:', error)
      setError('No se pudo mover la pregunta. Por favor, intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Funciones auxiliares para abrir formularios
  const openSectionForm = (section?: SurveySection) => {
    if (section) {
      setCurrentSection({
        id: section.id,
        title: section.title,
        description: section.description || '',
        section_order: section.section_order,
        discount_percentage_cumulative: section.discount_percentage_cumulative,
      })
    } else {
      // Para nueva sección, calcular el siguiente orden
      const nextOrder = sections.length > 0 ? Math.max(...sections.map(s => s.section_order)) + 1 : 0
      setCurrentSection({
        title: '',
        description: '',
        section_order: nextOrder,
        discount_percentage_cumulative: 0,
      })
    }
    setSectionFormOpen(true)
  }

  const openQuestionForm = (question?: Question, sectionId?: string) => {
    if (question) {
      setCurrentQuestion({
        id: question.id,
        section_id: question.section_id,
        question_text: question.question_text,
        question_type: question.question_type as any,
        options: question.options || '',
        is_required: question.is_required,
        question_order: question.question_order,
      })
    } else if (sectionId) {
      // Para nueva pregunta, calcular el siguiente orden
      const section = sections.find(s => s.id === sectionId)
      const nextOrder = section && section.questions.length > 0
        ? Math.max(...section.questions.map(q => q.question_order)) + 1
        : 0
      setCurrentQuestion({
        section_id: sectionId,
        question_text: '',
        question_type: 'text',
        options: '',
        is_required: true,
        question_order: nextOrder,
      })
    }
    setQuestionFormOpen(true)
  }

  // Manejar el cambio en la selección de un lote de códigos
  const handleBatchSelectionChange = (batchId: string, checked: boolean) => {
    if (checked) {
      setSelectedBatchIds(prev => [...prev, batchId])
    } else {
      setSelectedBatchIds(prev => prev.filter(id => id !== batchId))
    }
  }

  // Renderizar la lista de preguntas para una sección
  const renderQuestions = (section: SurveySection) => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Preguntas</h3>
          <Button
            size="sm"
            onClick={() => openQuestionForm(undefined, section.id)}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            <span>Añadir Pregunta</span>
          </Button>
        </div>

        {section.questions.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No hay preguntas en esta sección.</p>
        ) : (
          <div className="space-y-2">
            {section.questions.map((question) => (
              <div
                key={question.id}
                className="flex items-center justify-between rounded-md border p-3 bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">{question.question_text}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {question.question_type}
                    </Badge>
                    {question.is_required && (
                      <Badge variant="default" className="text-xs">
                        Requerida
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveQuestion(question.id, section.id, 'up')}
                    disabled={section.questions.indexOf(question) === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveQuestion(question.id, section.id, 'down')}
                    disabled={section.questions.indexOf(question) === section.questions.length - 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openQuestionForm(question)}
                    className="h-8 w-8 p-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar pregunta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Se eliminará permanentemente la pregunta
                          y sus datos asociados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/surveys')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </Button>

        {!loading && survey && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="flex items-center gap-1">
                <Trash2 className="h-4 w-4" />
                <span>Eliminar Encuesta</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminará permanentemente la encuesta
                  "{survey.name}" y todos sus datos asociados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {loading ? 'Cargando...' : `Editar Encuesta: ${survey?.name}`}
        </h1>
        <p className="mt-1 text-gray-500">
          Modifica los detalles de la encuesta según sea necesario.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
          <span className="ml-2">Cargando encuesta...</span>
        </div>
      ) : survey ? (
        <div className="space-y-6">
          {/* Formulario de la encuesta */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <SurveyForm
              initialData={survey}
              onSubmit={handleUpdate}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Lotes de códigos vinculados (solo si la encuesta requiere código de producto) */}
          {survey.requires_product_code && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Lotes de Códigos Vinculados</h2>
                <Button
                  onClick={saveCodeBatchLinks}
                  disabled={savingBatches}
                  className="flex items-center gap-1"
                >
                  {savingBatches ? 'Guardando...' : 'Guardar Vinculaciones'}
                </Button>
              </div>

              {batchError && (
                <div className="rounded-md bg-red-50 p-4 text-sm text-red-500 mb-4">
                  {batchError}
                </div>
              )}

              {loadingBatches ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
                  <span className="ml-2">Cargando lotes de códigos...</span>
                </div>
              ) : codeBatches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No hay lotes de códigos disponibles. Crea lotes de códigos en la sección correspondiente.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {codeBatches.map((batch) => (
                    <div key={batch.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`batch-${batch.id}`}
                        checked={selectedBatchIds.includes(batch.id)}
                        onCheckedChange={(checked) => handleBatchSelectionChange(batch.id, checked === true)}
                      />
                      <label
                        htmlFor={`batch-${batch.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {batch.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Secciones y preguntas */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Secciones y Preguntas</h2>
              <Button onClick={() => openSectionForm()} className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                <span>Añadir Sección</span>
              </Button>
            </div>

            {sections.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  No hay secciones en esta encuesta. Añade una sección para comenzar a crear preguntas.
                </p>
                <Button onClick={() => openSectionForm()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primera Sección
                </Button>
              </div>
            ) : (
              <Accordion type="multiple" className="w-full">
                {sections.map((section) => (
                  <AccordionItem key={section.id} value={section.id} className="border-b">
                    <div className="flex items-center">
                      <AccordionTrigger className="flex-1 hover:no-underline">
                        <div className="flex items-start gap-2 text-left">
                          <span className="font-medium">{section.title}</span>
                          <Badge variant="outline" className="ml-2">
                            {section.questions.length} {section.questions.length === 1 ? 'pregunta' : 'preguntas'}
                          </Badge>
                          {section.discount_percentage_cumulative > 0 && (
                            <Badge variant="success" className="ml-2">
                              {section.discount_percentage_cumulative}% descuento
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <div className="flex items-center gap-1 pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMoveSection(section.id, 'up')
                          }}
                          disabled={sections.indexOf(section) === 0}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMoveSection(section.id, 'down')
                          }}
                          disabled={sections.indexOf(section) === sections.length - 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openSectionForm(section)
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar sección?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente la sección
                                "{section.title}" y todas sus preguntas asociadas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteSection(section.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <AccordionContent className="pt-4 pb-2">
                      {section.description && (
                        <p className="text-sm text-gray-500 mb-4">{section.description}</p>
                      )}
                      {renderQuestions(section)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">No se encontró la encuesta solicitada.</p>
          <Button
            className="mt-4"
            onClick={() => navigate('/admin/surveys')}
          >
            Volver a Encuestas
          </Button>
        </div>
      )}

      {/* Formulario modal para secciones */}
      {currentSection && (
        <SectionForm
          surveyId={id || ''}
          initialData={currentSection}
          open={sectionFormOpen}
          onOpenChange={setSectionFormOpen}
          onSubmit={currentSection.id ? handleUpdateSection : handleCreateSection}
        />
      )}

      {/* Formulario modal para preguntas */}
      {currentQuestion && (
        <QuestionForm
          sectionId={currentQuestion.section_id}
          initialData={currentQuestion}
          open={questionFormOpen}
          onOpenChange={setQuestionFormOpen}
          onSubmit={currentQuestion.id ? handleUpdateQuestion : handleCreateQuestion}
        />
      )}
    </div>
  )
}
