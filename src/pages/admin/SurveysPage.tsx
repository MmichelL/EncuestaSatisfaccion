import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Edit, Trash2, MoreHorizontal, Plus, CheckCircle, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
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

  // Cargar encuestas desde Supabase
  useEffect(() => {
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

    fetchSurveys()
  }, [])

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
        <Button asChild className="shadow-sm">
          <Link to="/admin/surveys/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Crear Nueva Encuesta</span>
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm">
          {error}
        </div>
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
