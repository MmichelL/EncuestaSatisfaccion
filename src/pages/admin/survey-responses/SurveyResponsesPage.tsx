import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  FileText,
  Filter,
  X,
  Download,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { supabase } from '@/lib/supabaseClient'

// Interfaces para los datos
interface Survey {
  id: string
  name: string
}

interface SurveyResponse {
  id: string
  survey_id: string
  survey_name: string
  start_time: string
  completion_time: string | null
  status: 'in_progress' | 'completed' | 'abandoned'
  discount_percentage_achieved: number | null
  generated_discount_code: string | null
}

/**
 * Página para gestionar respuestas de encuestas
 */
export default function SurveyResponsesPage() {
  // Estados para los datos
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)

  // Estados para la paginación
  const [totalResponses, setTotalResponses] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Estados para los filtros
  const [surveyFilter, setSurveyFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(undefined)
  const [endDateFilter, setEndDateFilter] = useState<Date | undefined>(undefined)
  const [filtersVisible, setFiltersVisible] = useState(false)

  // Cargar encuestas para los filtros
  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        const { data, error } = await supabase
          .from('surveys')
          .select('id, name')
          .order('name')

        if (error) throw error
        setSurveys(data || [])
      } catch (error) {
        console.error('Error al cargar encuestas:', error)
      }
    }

    fetchSurveys()
  }, [])

  // Cargar respuestas de encuestas con filtros
  useEffect(() => {
    const fetchResponses = async () => {
      try {
        setLoading(true)
        setError(null)

        // Construir la consulta base
        let query = supabase
          .from('survey_responses')
          .select(`
            id,
            survey_id,
            surveys(name),
            start_time,
            completion_time,
            status,
            discount_percentage_achieved,
            generated_discount_code
          `, { count: 'exact' })

        // Aplicar filtros
        if (surveyFilter) {
          query = query.eq('survey_id', surveyFilter)
        }

        if (statusFilter) {
          query = query.eq('status', statusFilter)
        }

        if (startDateFilter) {
          const startDate = format(startDateFilter, 'yyyy-MM-dd')
          query = query.gte('start_time', `${startDate}T00:00:00`)
        }

        if (endDateFilter) {
          const endDate = format(endDateFilter, 'yyyy-MM-dd')
          query = query.lte('start_time', `${endDate}T23:59:59`)
        }

        // Aplicar paginación
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        query = query
          .order('start_time', { ascending: false })
          .range(from, to)

        // Ejecutar la consulta
        const { data, count, error } = await query

        if (error) throw error

        // Transformar los datos para la tabla
        const formattedData = data?.map(item => ({
          id: item.id,
          survey_id: item.survey_id,
          survey_name: item.surveys?.name || 'Desconocida',
          start_time: item.start_time,
          completion_time: item.completion_time,
          status: item.status,
          discount_percentage_achieved: item.discount_percentage_achieved,
          generated_discount_code: item.generated_discount_code,
        })) || []

        setResponses(formattedData)
        setTotalResponses(count || 0)
      } catch (error) {
        console.error('Error al cargar respuestas:', error)
        setError('No se pudieron cargar las respuestas. Por favor, intenta de nuevo.')
      } finally {
        setLoading(false)
      }
    }

    fetchResponses()
  }, [page, pageSize, surveyFilter, statusFilter, startDateFilter, endDateFilter])

  // Limpiar todos los filtros
  const clearFilters = () => {
    setSurveyFilter('')
    setStatusFilter('')
    setStartDateFilter(undefined)
    setEndDateFilter(undefined)
    setPage(1)
  }

  // Exportar respuestas a CSV
  const exportToCSV = async () => {
    try {
      setExportLoading(true)

      // Preparar los filtros para la función de exportación
      const filters = {
        survey_id: surveyFilter || undefined,
        status: statusFilter || undefined,
        start_date: startDateFilter ? format(startDateFilter, 'yyyy-MM-dd') : undefined,
        end_date: endDateFilter ? format(endDateFilter, 'yyyy-MM-dd') : undefined,
      }

      // Llamar a la función Edge de Supabase
      const { data, error } = await supabase.functions.invoke('export-responses-csv', {
        body: { filters },
      })

      if (error) throw error

      // Crear un blob con los datos CSV
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' })

      // Crear un enlace para descargar el archivo
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `respuestas-encuestas-${format(new Date(), 'yyyy-MM-dd')}.csv`)
      document.body.appendChild(link)

      // Simular clic en el enlace para iniciar la descarga
      link.click()

      // Limpiar
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al exportar respuestas:', error)
      alert('No se pudieron exportar las respuestas. Por favor, intenta de nuevo.')
    } finally {
      setExportLoading(false)
    }
  }

  // Definir columnas para la tabla
  const columns: ColumnDef<SurveyResponse>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <div className="font-mono text-xs text-gray-500">{row.getValue('id')}</div>,
    },
    {
      accessorKey: 'survey_name',
      header: 'Encuesta',
      cell: ({ row }) => <div className="font-medium text-gray-800">{row.getValue('survey_name')}</div>,
    },
    {
      accessorKey: 'start_time',
      header: 'Fecha',
      cell: ({ row }) => {
        const date = new Date(row.getValue('start_time'))
        return <div className="text-gray-700">{format(date, 'dd/MM/yyyy HH:mm', { locale: es })}</div>
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const status = row.getValue('status')
        switch (status) {
          case 'completed':
            return (
              <Badge variant="success" className="flex items-center gap-1.5 bg-green-100 text-green-700 hover:bg-green-100">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Completada</span>
              </Badge>
            )
          case 'in_progress':
            return (
              <Badge variant="secondary" className="flex items-center gap-1.5 bg-blue-100 text-blue-700 hover:bg-blue-100">
                <Clock className="h-3.5 w-3.5" />
                <span>En progreso</span>
              </Badge>
            )
          case 'abandoned':
            return (
              <Badge variant="outline" className="flex items-center gap-1.5 border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Abandonada</span>
              </Badge>
            )
          default:
            return <span>{status}</span>
        }
      },
    },
    {
      accessorKey: 'discount_percentage_achieved',
      header: 'Score',
      cell: ({ row }) => {
        const score = row.getValue('discount_percentage_achieved')
        return score !== null ? (
          <div className="font-medium text-blue-600">{score}%</div>
        ) : (
          <span className="text-gray-400">-</span>
        )
      },
    },
    {
      accessorKey: 'generated_discount_code',
      header: 'Código Descuento',
      cell: ({ row }) => {
        const code = row.getValue('generated_discount_code')
        return code ? (
          <div className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-medium text-gray-800">{code}</div>
        ) : (
          <span className="text-gray-400">-</span>
        )
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const id = row.original.id
        return (
          <Link
            to={`/admin/survey-responses/${id}`}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
          >
            <FileText className="h-4 w-4" />
            <span className="font-medium">Ver detalles</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        )
      },
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between space-y-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Respuestas de Encuestas</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersVisible(!filtersVisible)}
            className="flex items-center gap-1.5 border-gray-300 shadow-sm"
          >
            <Filter className="h-4 w-4 text-gray-500" />
            <span>{filtersVisible ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={exportLoading}
            className="flex items-center gap-1.5 border-gray-300 shadow-sm"
          >
            <Download className="h-4 w-4 text-gray-500" />
            <span>{exportLoading ? 'Exportando...' : 'Exportar a CSV'}</span>
          </Button>
          {(surveyFilter || statusFilter || startDateFilter || endDateFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
              <span>Limpiar filtros</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      {filtersVisible && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center">
            <Filter className="mr-2 h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-medium text-gray-800">Filtros de búsqueda</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Encuesta</label>
              <Select value={surveyFilter} onValueChange={setSurveyFilter}>
                <SelectTrigger className="border-gray-300 shadow-sm">
                  <SelectValue placeholder="Todas las encuestas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las encuestas</SelectItem>
                  {surveys.map((survey) => (
                    <SelectItem key={survey.id} value={survey.id}>
                      {survey.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Estado</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-gray-300 shadow-sm">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="in_progress">En progreso</SelectItem>
                  <SelectItem value="abandoned">Abandonada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Fecha inicio</label>
              <DatePicker
                date={startDateFilter}
                setDate={setStartDateFilter}
                placeholder="Fecha desde"
                className="border-gray-300 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Fecha fin</label>
              <DatePicker
                date={endDateFilter}
                setDate={setEndDateFilter}
                placeholder="Fecha hasta"
                className="border-gray-300 shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm">
          {error}
        </div>
      )}

      {/* Tabla de respuestas */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando respuestas...</span>
          </div>
        ) : responses.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center p-8">
            <FileText className="h-16 w-16 text-gray-300" />
            <p className="mt-4 text-center text-gray-600">No se encontraron respuestas de encuestas.</p>
            {(surveyFilter || statusFilter || startDateFilter || endDateFilter) && (
              <Button
                variant="link"
                onClick={clearFilters}
                className="mt-4 font-medium text-blue-600 hover:text-blue-700"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <div>
            <div className="p-1">
              <DataTable
                columns={columns}
                data={responses}
              />
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="text-sm font-medium text-gray-600">
                Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, totalResponses)} de {totalResponses} respuestas
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="border-gray-300 bg-white shadow-sm hover:bg-gray-50"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page * pageSize >= totalResponses}
                  className="border-gray-300 bg-white shadow-sm hover:bg-gray-50"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center space-x-4">
          <FileText size={48} className="text-blue-500" />
          <p className="text-lg text-gray-600">
            Visualiza y analiza las respuestas de las encuestas. Filtra por encuesta, fecha o
            producto y exporta los resultados para análisis detallado.
          </p>
        </div>
      </div>
    </div>
  )
}
