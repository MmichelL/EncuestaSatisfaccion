import { useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileText, Tag, Filter, X, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabaseClient'

// Interfaces para los datos
interface CodeBatch {
  id: string
  name: string
}

interface Survey {
  id: string
  name: string
}

interface ProductCode {
  id: string
  code_value: string
  batch_id: string
  batch_name: string
  status: 'available' | 'used'
  created_at: string
  used_at: string | null
  used_in_response_id: string | null
}

/**
 * Página para gestionar códigos de producto
 */
export default function ProductCodesPage() {
  // Estados para los datos
  const [productCodes, setProductCodes] = useState<ProductCode[]>([])
  const [codeBatches, setCodeBatches] = useState<CodeBatch[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para la paginación
  const [totalCodes, setTotalCodes] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // Estados para los filtros
  const [codeFilter, setCodeFilter] = useState('')
  const [batchFilter, setBatchFilter] = useState<string>('')
  const [surveyFilter, setSurveyFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [filtersVisible, setFiltersVisible] = useState(false)

  // Cargar lotes de códigos y encuestas para los filtros
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        // Obtener lotes de códigos
        const { data: batchesData, error: batchesError } = await supabase
          .from('code_batches')
          .select('id, name')
          .order('name')

        if (batchesError) throw batchesError
        setCodeBatches(batchesData || [])

        // Obtener encuestas
        const { data: surveysData, error: surveysError } = await supabase
          .from('surveys')
          .select('id, name')
          .order('name')

        if (surveysError) throw surveysError
        setSurveys(surveysData || [])
      } catch (error) {
        console.error('Error al cargar datos para filtros:', error)
      }
    }

    fetchFilterData()
  }, [])

  // Cargar códigos de producto con filtros
  useEffect(() => {
    const fetchProductCodes = async () => {
      try {
        setLoading(true)
        setError(null)

        // Construir la consulta base
        let query = supabase
          .from('product_codes')
          .select(`
            id, 
            code_value,
            batch_id,
            code_batches(name),
            status,
            created_at,
            used_at,
            used_in_response_id
          `, { count: 'exact' })

        // Aplicar filtros
        if (codeFilter) {
          query = query.ilike('code_value', `%${codeFilter}%`)
        }

        if (batchFilter) {
          query = query.eq('batch_id', batchFilter)
        }

        if (statusFilter) {
          if (statusFilter === 'available') {
            query = query.is('used_at', null)
          } else if (statusFilter === 'used') {
            query = query.not('used_at', 'is', null)
          }
        }

        // Si hay filtro de encuesta, es más complejo (requiere múltiples joins)
        if (surveyFilter) {
          // Primero obtenemos los batch_ids vinculados a la encuesta
          const { data: batchIds, error: batchIdsError } = await supabase
            .from('survey_code_batches')
            .select('batch_id')
            .eq('survey_id', surveyFilter)

          if (batchIdsError) throw batchIdsError

          if (batchIds && batchIds.length > 0) {
            const batchIdList = batchIds.map(item => item.batch_id)
            query = query.in('batch_id', batchIdList)
          } else {
            // Si no hay lotes vinculados a la encuesta, no debería haber resultados
            setProductCodes([])
            setTotalCodes(0)
            setLoading(false)
            return
          }
        }

        // Aplicar paginación
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        
        query = query
          .order('created_at', { ascending: false })
          .range(from, to)

        // Ejecutar la consulta
        const { data, count, error } = await query

        if (error) throw error

        // Transformar los datos para la tabla
        const formattedData = data?.map(item => ({
          id: item.id,
          code_value: item.code_value,
          batch_id: item.batch_id,
          batch_name: item.code_batches?.name || 'Desconocido',
          status: item.used_at ? 'used' : 'available',
          created_at: item.created_at,
          used_at: item.used_at,
          used_in_response_id: item.used_in_response_id,
        })) || []

        setProductCodes(formattedData)
        setTotalCodes(count || 0)
      } catch (error) {
        console.error('Error al cargar códigos de producto:', error)
        setError('No se pudieron cargar los códigos de producto. Por favor, intenta de nuevo.')
      } finally {
        setLoading(false)
      }
    }

    fetchProductCodes()
  }, [page, pageSize, codeFilter, batchFilter, surveyFilter, statusFilter])

  // Limpiar todos los filtros
  const clearFilters = () => {
    setCodeFilter('')
    setBatchFilter('')
    setSurveyFilter('')
    setStatusFilter('')
    setPage(1)
  }

  // Definir columnas para la tabla
  const columns: ColumnDef<ProductCode>[] = [
    {
      accessorKey: 'code_value',
      header: 'Código',
      cell: ({ row }) => <div className="font-medium">{row.getValue('code_value')}</div>,
    },
    {
      accessorKey: 'batch_name',
      header: 'Lote',
      cell: ({ row }) => <div>{row.getValue('batch_name')}</div>,
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const status = row.getValue('status')
        return status === 'available' ? (
          <Badge variant="success" className="flex items-center gap-1">
            <span>Disponible</span>
          </Badge>
        ) : (
          <Badge variant="secondary" className="flex items-center gap-1">
            <span>Usado</span>
          </Badge>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Fecha Creación',
      cell: ({ row }) => {
        const date = new Date(row.getValue('created_at'))
        return <div>{format(date, 'dd/MM/yyyy HH:mm', { locale: es })}</div>
      },
    },
    {
      accessorKey: 'used_in_response_id',
      header: 'Respuesta',
      cell: ({ row }) => {
        const responseId = row.getValue('used_in_response_id')
        return responseId ? (
          <Link 
            to={`/admin/survey-responses/${responseId}`} 
            className="flex items-center gap-1 text-blue-600 hover:underline"
          >
            <FileText className="h-4 w-4" />
            <span>Ver respuesta</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          <span className="text-gray-400">-</span>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Códigos de Producto</h1>
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
          {(codeFilter || batchFilter || surveyFilter || statusFilter) && (
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
              <label className="text-sm font-medium">Código</label>
              <Input
                placeholder="Buscar por código..."
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Lote</label>
              <Select value={batchFilter} onValueChange={setBatchFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los lotes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los lotes</SelectItem>
                  {codeBatches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="used">Usado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Tabla de códigos */}
      <div className="rounded-lg border bg-white shadow-sm">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
            <span className="ml-2">Cargando códigos...</span>
          </div>
        ) : productCodes.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center">
            <Tag className="h-10 w-10 text-gray-400" />
            <p className="mt-2 text-gray-500">No se encontraron códigos de producto.</p>
            {(codeFilter || batchFilter || surveyFilter || statusFilter) && (
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
              data={productCodes}
            />
            
            {/* Paginación */}
            <div className="flex items-center justify-between border-t p-4">
              <div className="text-sm text-gray-500">
                Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, totalCodes)} de {totalCodes} códigos
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
                  disabled={page * pageSize >= totalCodes}
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
