import { useState, useEffect } from 'react'

// Tipo para las respuestas
type AnswersMap = Record<string, string | string[]>

// Tipo para el estado del progreso
interface SurveyProgressState {
  currentSectionIndex: number
  answers: AnswersMap
  responseId: string | null
  completedSections: string[]
  productCodeId: string | null
}

// Estado inicial por defecto
const defaultState: SurveyProgressState = {
  currentSectionIndex: 0,
  answers: {},
  responseId: null,
  completedSections: [],
  productCodeId: null,
}

/**
 * Hook personalizado para gestionar el progreso de una encuesta
 * Guarda y carga el estado en localStorage
 */
export function useSurveyProgress(surveySlug: string) {
  // Clave única para localStorage
  const storageKey = `survey_progress_${surveySlug}`

  // Inicializar el estado desde localStorage o usar valores por defecto
  const [state, setState] = useState<SurveyProgressState>(() => {
    if (typeof window === 'undefined') return defaultState

    const savedState = localStorage.getItem(storageKey)
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        
        // Convertir el array de completedSections de vuelta a Set
        return {
          ...parsed,
          // Asegurarse de que completedSections sea un array
          completedSections: Array.isArray(parsed.completedSections) 
            ? parsed.completedSections 
            : []
        }
      } catch (error) {
        console.error('Error parsing saved survey progress:', error)
        return defaultState
      }
    }
    return defaultState
  })

  // Extraer valores individuales del estado para facilitar su uso
  const { currentSectionIndex, answers, responseId, completedSections, productCodeId } = state

  // Guardar el estado en localStorage cuando cambie
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(state))
    }
  }, [state, storageKey])

  // Función para actualizar el índice de la sección actual
  const setCurrentSectionIndex = (index: number) => {
    setState(prev => ({ ...prev, currentSectionIndex: index }))
  }

  // Función para actualizar las respuestas
  const setAnswers = (newAnswers: AnswersMap | ((prev: AnswersMap) => AnswersMap)) => {
    setState(prev => ({
      ...prev,
      answers: typeof newAnswers === 'function' ? newAnswers(prev.answers) : newAnswers,
    }))
  }

  // Función para actualizar una respuesta individual
  const updateAnswer = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }))
  }

  // Función para establecer el ID de la respuesta
  const setResponseId = (id: string | null) => {
    setState(prev => ({ ...prev, responseId: id }))
  }

  // Función para actualizar las secciones completadas
  const setCompletedSections = (
    newSections: string[] | ((prev: string[]) => string[])
  ) => {
    setState(prev => ({
      ...prev,
      completedSections: typeof newSections === 'function' 
        ? newSections(prev.completedSections) 
        : newSections,
    }))
  }

  // Función para añadir una sección completada
  const addCompletedSection = (sectionId: string) => {
    setCompletedSections(prev => {
      if (prev.includes(sectionId)) return prev
      return [...prev, sectionId]
    })
  }

  // Función para establecer el ID del código de producto
  const setProductCodeId = (id: string | null) => {
    setState(prev => ({ ...prev, productCodeId: id }))
  }

  // Función para limpiar el progreso guardado
  const clearProgress = () => {
    setState(defaultState)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey)
    }
  }

  return {
    // Estado
    currentSectionIndex,
    answers,
    responseId,
    completedSections,
    productCodeId,
    
    // Funciones para actualizar el estado
    setCurrentSectionIndex,
    setAnswers,
    updateAnswer,
    setResponseId,
    setCompletedSections,
    addCompletedSection,
    setProductCodeId,
    clearProgress,
  }
}
