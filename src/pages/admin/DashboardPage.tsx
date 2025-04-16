import { useState, useEffect } from 'react'
import { BarChart3, ClipboardList, FileText, Tag, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'

/**
 * Componente para mostrar una tarjeta de estadísticas
 */
function StatCard({
  title,
  value,
  icon,
  isLoading,
  error,
  color = 'text-blue-500',
}: {
  title: string
  value: number | null
  icon: React.ReactNode
  isLoading: boolean
  error: string | null
  color?: string
}) {
  return (
    <Card className="overflow-hidden border-none shadow-md transition-all hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-gray-50 pb-3 pt-3">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
        <div className={`${color} rounded-full bg-white p-2 shadow-sm`}>{icon}</div>
      </CardHeader>
      <CardContent className="px-6 py-4">
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
            <p className="text-sm text-gray-500">Cargando...</p>
          </div>
        ) : error ? (
          <div className="flex items-center space-x-2 text-red-500">
            <AlertCircle size={16} />
            <p className="text-sm">Error al cargar datos</p>
          </div>
        ) : (
          <div className="text-3xl font-bold text-gray-800">{value !== null ? value : '-'}</div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Página de Dashboard para el panel de administración
 * Muestra un resumen de la actividad y estadísticas
 */
export default function DashboardPage() {
  const { session } = useAuth()
  const [stats, setStats] = useState({
    activeSurveys: { value: null as number | null, isLoading: true, error: null as string | null },
    todayResponses: { value: null as number | null, isLoading: true, error: null as string | null },
    availableCodes: { value: null as number | null, isLoading: true, error: null as string | null },
  })

  // Obtener estadísticas de Supabase
  useEffect(() => {
    // Función para obtener el número de encuestas activas
    const fetchActiveSurveys = async () => {
      try {

        const { count, error } = await supabase
          .from('surveys')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)

        if (error) throw error

        setStats(prev => ({
          ...prev,
          activeSurveys: { value: count, isLoading: false, error: null },
        }))
      } catch (error) {
        console.error('Error al obtener encuestas activas:', error)
        setStats(prev => ({
          ...prev,
          activeSurveys: { value: null, isLoading: false, error: 'Error al cargar datos' },
        }))
      }
    }

    // Función para obtener el número de respuestas de hoy
    const fetchTodayResponses = async () => {
      try {

        // Obtener la fecha de hoy en formato ISO (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0]

        const { count, error } = await supabase
          .from('survey_responses')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`)

        if (error) throw error

        setStats(prev => ({
          ...prev,
          todayResponses: { value: count, isLoading: false, error: null },
        }))
      } catch (error) {
        console.error('Error al obtener respuestas de hoy:', error)
        setStats(prev => ({
          ...prev,
          todayResponses: { value: null, isLoading: false, error: 'Error al cargar datos' },
        }))
      }
    }

    // Función para obtener el número de códigos disponibles
    const fetchAvailableCodes = async () => {
      try {

        const { count, error } = await supabase
          .from('product_codes')
          .select('id', { count: 'exact', head: true })
          .is('used_at', null)

        if (error) throw error

        setStats(prev => ({
          ...prev,
          availableCodes: { value: count, isLoading: false, error: null },
        }))
      } catch (error) {
        console.error('Error al obtener códigos disponibles:', error)
        setStats(prev => ({
          ...prev,
          availableCodes: { value: null, isLoading: false, error: 'Error al cargar datos' },
        }))
      }
    }

    // Ejecutar las funciones para obtener los datos
    fetchActiveSurveys()
    fetchTodayResponses()
    fetchAvailableCodes()
  }, [])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Mensaje de bienvenida */}
      <Card className="border-none bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md">
        <CardContent className="p-8">
          <div className="flex flex-col items-start space-y-4 md:flex-row md:items-center md:space-x-6 md:space-y-0">
            <div className="rounded-full bg-white p-4 shadow-md">
              <BarChart3 size={48} className="text-blue-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Bienvenido al Panel de Administración</h3>
              <p className="mt-2 text-gray-600">
                Aquí podrás gestionar encuestas, códigos de producto y ver estadísticas detalladas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas de estadísticas */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Estadísticas Generales</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Encuestas Activas"
            value={stats.activeSurveys.value}
            icon={<ClipboardList size={20} />}
            isLoading={stats.activeSurveys.isLoading}
            error={stats.activeSurveys.error}
            color="text-blue-500"
          />
          <StatCard
            title="Respuestas Hoy"
            value={stats.todayResponses.value}
            icon={<FileText size={20} />}
            isLoading={stats.todayResponses.isLoading}
            error={stats.todayResponses.error}
            color="text-green-500"
          />
          <StatCard
            title="Códigos Disponibles"
            value={stats.availableCodes.value}
            icon={<Tag size={20} />}
            isLoading={stats.availableCodes.isLoading}
            error={stats.availableCodes.error}
            color="text-purple-500"
          />
        </div>
      </div>
    </div>
  )
}
