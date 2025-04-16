import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
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
    <div className="flex h-screen w-full bg-gray-50">
      {/* Barra lateral */}
      <aside className="fixed inset-y-0 left-0 z-20 w-64 bg-white shadow-lg">
        <div className="flex h-16 items-center justify-center border-b border-gray-100">
          <h1 className="text-xl font-bold text-blue-600">Encuesta Satisfacción</h1>
        </div>
        <nav className="mt-6 px-4">
          <ul className="space-y-1">
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
        <div className="absolute bottom-0 w-full border-t border-gray-100 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center rounded-md px-4 py-2.5 text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={20} className="mr-3" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="ml-64 flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Panel de Administración</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2.5 rounded-full bg-gray-50 px-4 py-1.5">
              <User size={18} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700">
                {user?.email}
              </span>
            </div>
          </div>
        </header>

        {/* Área de contenido principal */}
        <main className="flex-1 overflow-auto p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
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
  // Usar useLocation para determinar si el enlace está activo
  const { pathname } = useLocation();
  const isActive = active || (pathname === to || pathname.startsWith(`${to}/`));

  return (
    <li>
      <Link
        to={to}
        className={cn(
          'flex items-center rounded-md px-4 py-2.5 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600',
          isActive && 'bg-blue-50 font-medium text-blue-600'
        )}
      >
        <span className={cn("mr-3", isActive && "text-blue-600")}>{icon}</span>
        <span>{label}</span>
      </Link>
    </li>
  )
}
