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
      cell: ({ row }) => <div className="font-mono text-xs">{row.getValue('id')}</div>,
    },
    {
      accessorKey: 'survey_name',
      header: 'Encuesta',
      cell: ({ row }) => <div className="font-medium">{row.getValue('survey_name')}</div>,
    },
    {
      accessorKey: 'start_time',
      header: 'Fecha',
      cell: ({ row }) => {
        const date = new Date(row.getValue('start_time'))
        return <div>{format(date, 'dd/MM/yyyy HH:mm', { locale: es })}</div>
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
      },
    },
    {
      accessorKey: 'discount_percentage_achieved',
      header: 'Score',
      cell: ({ row }) => {
        const score = row.getValue('discount_percentage_achieved')
        return score !== null ? `${score}%` : '-'
      },
    },
    {
      accessorKey: 'generated_discount_code',
      header: 'Código Descuento',
      cell: ({ row }) => {
        const code = row.getValue('generated_discount_code')
        return code ? (
          <div className="font-mono text-xs">{code}</div>
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
            className="flex items-center gap-1 text-blue-600 hover:underline"
          >
            <FileText className="h-4 w-4" />
            <span>Ver detalles</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Respuestas de Encuestas</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersVisible(!filtersVisible)}
            className="flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            <span>{filtersVisible ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={exportLoading}
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            <span>{exportLoading ? 'Exportando...' : 'Exportar a CSV'}</span>
          </Button>
          {(surveyFilter || statusFilter || startDateFilter || endDateFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="flex items-center gap-1 text-red-500 hover:text-red-600"
            >
              <X className="h-4 w-4" />
              <span>Limpiar filtros</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      {filtersVisible && (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Encuesta</label>
              <Select value={surveyFilter} onValueChange={setSurveyFilter}>
                <SelectTrigger>
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
              <label className="text-sm font-medium">Estado</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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
              <label className="text-sm font-medium">Fecha inicio</label>
              <DatePicker
                date={startDateFilter}
                setDate={setStartDateFilter}
                placeholder="Fecha desde"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha fin</label>
              <DatePicker
                date={endDateFilter}
                setDate={setEndDateFilter}
                placeholder="Fecha hasta"
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Tabla de respuestas */}
      <div className="rounded-lg border bg-white shadow-sm">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
            <span className="ml-2">Cargando respuestas...</span>
          </div>
        ) : responses.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center">
            <FileText className="h-10 w-10 text-gray-400" />
            <p className="mt-2 text-gray-500">No se encontraron respuestas de encuestas.</p>
            {(surveyFilter || statusFilter || startDateFilter || endDateFilter) && (
              <Button
                variant="link"
                onClick={clearFilters}
                className="mt-2 text-blue-600"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <div>
            <DataTable
              columns={columns}
              data={responses}
            />
            
            {/* Paginación */}
            <div className="flex items-center justify-between border-t p-4">
              <div className="text-sm text-gray-500">
                Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, totalResponses)} de {totalResponses} respuestas
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page * pageSize >= totalResponses}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
