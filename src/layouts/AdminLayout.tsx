import { Link, Outlet, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Package,
  Settings,
  Tag,
  User,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Layout para la sección de administración
 * Incluye una barra lateral con enlaces a las diferentes secciones
 * y un área principal donde se renderiza el contenido de la ruta hija
 */
export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  // Manejar el cierre de sesión
  const handleLogout = async () => {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <div className="flex h-screen w-full bg-gray-100">
      {/* Barra lateral */}
      <aside className="fixed inset-y-0 left-0 z-10 w-64 bg-white shadow-md">
        <div className="flex h-16 items-center justify-center border-b">
          <h1 className="text-xl font-bold text-gray-800">Encuesta Satisfacción</h1>
        </div>
        <nav className="mt-6 px-4">
          <ul className="space-y-2">
            <NavItem to="/admin" icon={<Home size={20} />} label="Dashboard" />
            <NavItem to="/admin/surveys" icon={<ClipboardList size={20} />} label="Encuestas" />
            <NavItem to="/admin/code-batches" icon={<Package size={20} />} label="Lotes de Códigos" />
            <NavItem
              to="/admin/product-codes"
              icon={<Tag size={20} />}
              label="Códigos de Producto"
            />
            <NavItem
              to="/admin/survey-responses"
              icon={<FileText size={20} />}
              label="Respuestas"
            />
            <NavItem to="/admin/settings" icon={<Settings size={20} />} label="Configuración" />
          </ul>
        </nav>
        <div className="absolute bottom-0 w-full border-t p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center rounded-md px-4 py-2 text-gray-600 hover:bg-gray-100 hover:text-red-600"
          >
            <LogOut size={20} className="mr-3" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="ml-64 flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-800">Panel de Administración</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2">
              <User size={18} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-600">
                {user?.email}
              </span>
            </div>
          </div>
        </header>

        {/* Área de contenido principal */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/**
 * Componente para los elementos de navegación en la barra lateral
 */
function NavItem({
  to,
  icon,
  label,
  active,
}: {
  to: string
  icon: React.ReactNode
  label: string
  active?: boolean
}) {
  return (
    <li>
      <Link
        to={to}
        className={cn(
          'flex items-center rounded-md px-4 py-2 text-gray-600 hover:bg-gray-100',
          active && 'bg-gray-100 font-medium text-gray-900'
        )}
      >
        <span className="mr-3">{icon}</span>
        <span>{label}</span>
      </Link>
    </li>
  )
}
