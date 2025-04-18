import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Edit, Trash2, MoreHorizontal, Plus, CheckCircle, XCircle, Upload, Loader2, AlertCircle, Download } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabaseClient'
import { ColumnDef } from '@tanstack/react-table'
import surveyImportSchema from '@/lib/surveyImportSchema'

// Plantilla JSON con documentación detallada
const jsonTemplate = `{
  /* DOCUMENTACIÓN DE LA ESTRUCTURA JSON PARA IMPORTAR ENCUESTAS

  Este archivo contiene un ejemplo de la estructura JSON requerida para importar encuestas.
  A continuación se detallan los campos y sus requisitos:

  ESTRUCTURA PRINCIPAL:
  - survey: Objeto con la información básica de la encuesta
  - sections: Array de objetos con las secciones de la encuesta

  CAMPOS DE SURVEY:
  - name: (String, requerido) Nombre de la encuesta
  - slug: (String, requerido) Identificador único para URL (solo letras minúsculas, números y guiones)
  - description: (String, opcional) Descripción de la encuesta
  - is_active: (Boolean, default: false) Indica si la encuesta está activa
  - requires_product_code: (Boolean, default: false) Indica si se requiere un código de producto para acceder
  - discount_code_template: (String, requerido) Plantilla para generar códigos de descuento. Debe incluir al menos uno de los placeholders: {PERCENT}, {CODE}
  - discount_code_validity_days: (Number, default: 30) Días de validez del código generado

  CAMPOS DE SECTION:
  - title: (String, requerido) Título de la sección
  - description: (String, opcional) Descripción de la sección
  - section_order: (Number, requerido) Orden numérico de la sección (debe ser único)
  - discount_percentage_cumulative: (Number, requerido) Porcentaje de descuento acumulado al completar esta sección (0-100)
  - questions: (Array, requerido) Array de objetos con las preguntas de la sección

  CAMPOS DE QUESTION:
  - question_text: (String, requerido) Texto de la pregunta
  - question_type: (String, requerido) Tipo de pregunta. Valores permitidos:
      * text_short: Campo de texto corto
      * text_long: Área de texto largo
      * radio: Selección única (requiere options)
      * checkbox: Selección múltiple (requiere options)
      * scale: Escala numérica (requiere options)
      * dropdown: Lista desplegable (requiere options)
      * email: Campo para correo electrónico
      * phone: Campo para número telefónico
      * name: Campo para nombre
  - options: (Array, requerido para radio/checkbox/scale/dropdown) Array de objetos {value, label} con las opciones
  - is_required: (Boolean, default: false) Indica si la pregunta es obligatoria
  - question_order: (Number, requerido) Orden numérico de la pregunta dentro de la sección (debe ser único dentro de la sección)
  */

  "survey": {
    "name": "Encuesta de Satisfacción del Cliente",
    "slug": "encuesta-satisfaccion-cliente",
    "description": "Ayudanos a mejorar nuestros productos y servicios con tus comentarios",
    "is_active": true,
    "requires_product_code": true,
    "discount_code_template": "DESC{PERCENT}-{CODE}",
    "discount_code_validity_days": 30
  },
  "sections": [
    {
      "title": "Información Personal",
      "description": "Por favor, cuéntanos un poco sobre ti",
      "section_order": 0,
      "discount_percentage_cumulative": 5,
      "questions": [
        {
          "question_text": "Nombre completo",
          "question_type": "name",
          "is_required": true,
          "question_order": 0
        },
        {
          "question_text": "Correo electrónico",
          "question_type": "email",
          "is_required": true,
          "question_order": 1
        },
        {
          "question_text": "Número de teléfono",
          "question_type": "phone",
          "is_required": false,
          "question_order": 2
        }
      ]
    },
    {
      "title": "Evaluación del Producto",
      "description": "Evalúa tu experiencia con nuestro producto",
      "section_order": 1,
      "discount_percentage_cumulative": 10,
      "questions": [
        {
          "question_text": "¿Cómo calificarías la calidad general del producto?",
          "question_type": "scale",
          "options": [
            {"value": "1", "label": "Muy mala"},
            {"value": "2", "label": "Mala"},
            {"value": "3", "label": "Regular"},
            {"value": "4", "label": "Buena"},
            {"value": "5", "label": "Excelente"}
          ],
          "is_required": true,
          "question_order": 0
        },
        {
          "question_text": "¿Qué aspectos del producto te gustaron más?",
          "question_type": "checkbox",
          "options": [
            {"value": "diseno", "label": "Diseño"},
            {"value": "calidad", "label": "Calidad"},
            {"value": "precio", "label": "Precio"},
            {"value": "funcionalidad", "label": "Funcionalidad"},
            {"value": "durabilidad", "label": "Durabilidad"}
          ],
          "is_required": true,
          "question_order": 1
        },
        {
          "question_text": "¿Cuál fue tu principal razón para comprar este producto?",
          "question_type": "radio",
          "options": [
            {"value": "necesidad", "label": "Necesidad"},
            {"value": "recomendacion", "label": "Recomendación"},
            {"value": "precio", "label": "Precio"},
            {"value": "calidad", "label": "Calidad"},
            {"value": "marca", "label": "Marca"}
          ],
          "is_required": true,
          "question_order": 2
        }
      ]
    },
    {
      "title": "Comentarios Adicionales",
      "description": "Comparte cualquier comentario adicional que tengas",
      "section_order": 2,
      "discount_percentage_cumulative": 15,
      "questions": [
        {
          "question_text": "¿Tienes alguna sugerencia para mejorar nuestro producto?",
          "question_type": "text_long",
          "is_required": false,
          "question_order": 0
        },
        {
          "question_text": "¿Cómo calificarías nuestra atención al cliente?",
          "question_type": "dropdown",
          "options": [
            {"value": "excelente", "label": "Excelente"},
            {"value": "buena", "label": "Buena"},
            {"value": "regular", "label": "Regular"},
            {"value": "mala", "label": "Mala"},
            {"value": "pesima", "label": "Pésima"}
          ],
          "is_required": true,
          "question_order": 1
        },
        {
          "question_text": "¿Algo más que quieras compartir?",
          "question_type": "text_short",
          "is_required": false,
          "question_order": 2
        }
      ]
    }
  ]
}`

// Tipo para los datos de encuesta
interface Survey {
  id: string
  name: string
  slug: string
  is_active: boolean
  requires_product_code: boolean
  created_at: string
}

/**
 * Página de gestión de encuestas
 * Permite crear, editar y eliminar encuestas
 */
export default function SurveysPage() {
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados para la importación
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Función para descargar la plantilla JSON
  const downloadTemplate = () => {
    // Crear un blob con el contenido de la plantilla
    const blob = new Blob([jsonTemplate], { type: 'application/json' })

    // Crear una URL para el blob
    const url = URL.createObjectURL(blob)

    // Crear un elemento <a> temporal
    const link = document.createElement('a')
    link.href = url
    link.download = 'plantilla_encuesta.json'

    // Simular un clic en el enlace
    document.body.appendChild(link)
    link.click()

    // Eliminar el enlace y revocar la URL
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Cargar encuestas desde Supabase
  const fetchSurveys = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setSurveys(data || [])
    } catch (error) {
      console.error('Error al cargar encuestas:', error)
      setError('No se pudieron cargar las encuestas. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSurveys()
  }, [])

  // Manejar la selección de archivo JSON para importar
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Limpiar mensajes previos
    setImportError(null)
    setImportSuccess(null)

    const file = event.target.files?.[0]
    if (!file) return

    // Verificar que sea un archivo JSON
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setImportError('El archivo debe ser de tipo JSON (.json)')
      event.target.value = ''
      return
    }

    setIsImporting(true)

    try {
      // Leer el contenido del archivo
      const fileContent = await file.text()

      // Intentar parsear el JSON
      let parsedJson
      try {
        parsedJson = JSON.parse(fileContent)
      } catch (parseError) {
        setImportError('El archivo no contiene un JSON válido. Por favor, verifica el formato.')
        setIsImporting(false)
        if (event.target) event.target.value = ''
        return
      }

      // Validar la estructura con Zod
      const validationResult = surveyImportSchema.safeParse(parsedJson)

      if (!validationResult.success) {
        // Formatear errores de validación de manera más detallada
        console.error('[IMPORT_SURVEY] Errores de validación:', validationResult.error.errors)

        // Función para formatear los errores de Zod de manera más legible
        const formatZodErrors = (errors: z.ZodIssue[]) => {
          return errors.map(err => `  - Campo '${err.path.join('.')}': ${err.message}`).join('\n')
        }

        const errorMessage = `El archivo JSON no es válido.\nErrores encontrados:\n${formatZodErrors(validationResult.error.errors)}`
        setImportError(errorMessage)
        setIsImporting(false)
        if (event.target) event.target.value = ''
        return
      }

      // Si la validación es exitosa, loggear los datos y llamar al RPC
      console.log('[IMPORT_SURVEY] Datos validados enviados a RPC:', JSON.stringify(validationResult.data, null, 2))

      const { data, error: rpcError } = await supabase.rpc('import_survey_from_json', {
        survey_data: validationResult.data
      })

      if (rpcError) {
        // Error de la API de Supabase
        console.error('[IMPORT_SURVEY] Error RPC:', rpcError)
        setImportError(`Error de comunicación con el servidor: ${rpcError.message}`)
        setIsImporting(false)
        if (event.target) event.target.value = ''
        return
      }

      // Verificar la respuesta del RPC
      if (data && data.success) {
        // Importación exitosa
        console.log('[IMPORT_SURVEY] Importación exitosa:', data)
        setImportSuccess(`Encuesta importada correctamente con ID: ${data.surveyId}`)
        // Recargar la lista de encuestas
        fetchSurveys()
      } else if (data && !data.success) {
        // Error devuelto por la función de base de datos
        console.error('[IMPORT_SURVEY] Error devuelto por la función DB:', data.error)

        // Muestra el mensaje y detalles de la BD si están disponibles
        const dbMessage = data.error?.message || 'Error desconocido en la base de datos.'
        const dbDetails = data.error?.details ? ` (${data.error.details})` : ''
        const dbCode = data.error?.code ? `\nCódigo: ${data.error.code}` : ''
        const dbHint = data.error?.hint ? `\nSugerencia: ${data.error.hint}` : ''

        setImportError(`Error al importar en la base de datos: ${dbMessage}${dbDetails}${dbCode}${dbHint}`)
      } else {
        // Respuesta inesperada
        console.error('[IMPORT_SURVEY] Respuesta inesperada del RPC:', data)
        setImportError('Respuesta inesperada del servidor después de la importación.')
      }
    } catch (error: any) {
      // Error inesperado
      console.error('[IMPORT_SURVEY] Error al importar encuesta:', error)
      setImportError(`Error inesperado: ${error.message || 'Error al importar la encuesta'}`)
    } finally {
      setIsImporting(false)
      // Limpiar el input de archivo
      if (event.target) event.target.value = ''
    }
  }

  // Definir columnas para la tabla
  const columns: ColumnDef<Survey>[] = [
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => <div className="font-medium text-gray-800">{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      cell: ({ row }) => <div className="text-sm text-gray-500">{row.getValue('slug')}</div>,
    },
    {
      accessorKey: 'is_active',
      header: '¿Activa?',
      cell: ({ row }) => {
        const isActive = row.getValue('is_active')
        return isActive ? (
          <Badge variant="success" className="flex items-center gap-1.5 bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Activa</span>
          </Badge>
        ) : (
          <Badge variant="secondary" className="flex items-center gap-1.5 bg-gray-100 text-gray-700 hover:bg-gray-100">
            <XCircle className="h-3.5 w-3.5" />
            <span>Inactiva</span>
          </Badge>
        )
      },
    },
    {
      accessorKey: 'requires_product_code',
      header: '¿Requiere Código?',
      cell: ({ row }) => {
        const requiresCode = row.getValue('requires_product_code')
        return requiresCode ? (
          <Badge variant="default" className="flex items-center gap-1.5 bg-blue-100 text-blue-700 hover:bg-blue-100">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Sí</span>
          </Badge>
        ) : (
          <Badge variant="secondary" className="flex items-center gap-1.5 bg-gray-100 text-gray-700 hover:bg-gray-100">
            <XCircle className="h-3.5 w-3.5" />
            <span>No</span>
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const survey = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => navigate(`/admin/surveys/${survey.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4 text-blue-500" />
                <span>Editar</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-red-600"
                onClick={() => navigate(`/admin/surveys/${survey.id}/edit`)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Eliminar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between space-y-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Encuestas</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="shadow-sm">
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Importando...</span>
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                <span>Importar desde JSON</span>
              </>
            )}
          </Button>
          <Button variant="outline" onClick={downloadTemplate} className="shadow-sm">
            <Download className="mr-2 h-4 w-4" />
            <span>Descargar Plantilla JSON</span>
          </Button>
          <Button asChild className="shadow-sm">
            <Link to="/admin/surveys/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Crear Nueva Encuesta</span>
            </Link>
          </Button>
        </div>
        {/* Input de archivo oculto */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json"
          className="hidden"
        />
      </div>

      {/* Mensajes de error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm">
          {error}
        </div>
      )}

      {/* Mensaje de error de importación */}
      {importError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription className="whitespace-pre-line">
            {importError}
          </AlertDescription>
        </Alert>
      )}

      {/* Mensaje de éxito de importación */}
      {importSuccess && (
        <Alert className="mb-4 border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
          <AlertDescription>
            {importSuccess}
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando encuestas...</span>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={surveys}
            searchColumn="name"
            searchPlaceholder="Buscar por nombre..."
          />
        )}
      </div>
    </div>
  )
}
