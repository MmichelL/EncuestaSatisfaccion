import { createBrowserRouter } from 'react-router-dom'

// Layouts
import AdminLayout from './layouts/AdminLayout'

// Componentes de autenticación
import ProtectedRoute from './components/auth/ProtectedRoute'

// Páginas de administración
import DashboardPage from './pages/admin/DashboardPage'
import SurveysPage from './pages/admin/SurveysPage'
import CodeBatchesPage from './pages/admin/CodeBatchesPage'
import ProductCodesPage from './pages/admin/ProductCodesPage'
import SurveyResponsesPage from './pages/admin/SurveyResponsesPage'
import SettingsPage from './pages/admin/SettingsPage'
import LoginPage from './pages/admin/LoginPage'

/**
 * Configuración de rutas de la aplicación
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <div>Página de inicio pública</div>,
  },
  {
    path: '/admin/login',
    element: <LoginPage />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'surveys',
        element: <SurveysPage />,
      },
      {
        path: 'code-batches',
        element: <CodeBatchesPage />,
      },
      {
        path: 'product-codes',
        element: <ProductCodesPage />,
      },
      {
        path: 'survey-responses',
        element: <SurveyResponsesPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <div>Página no encontrada</div>,
  },
])
