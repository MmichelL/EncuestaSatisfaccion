import { createBrowserRouter } from 'react-router-dom'

// Layouts
import AdminLayout from './layouts/AdminLayout'

// Componentes de autenticación
import ProtectedRoute from './components/auth/ProtectedRoute'

// Páginas públicas
import SurveyPage from './pages/public/SurveyPage'

// Páginas de autenticación
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import UpdatePasswordPage from './pages/auth/UpdatePasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import AuthCallbackPage from './pages/auth/AuthCallbackPage'

// Páginas de administración
import DashboardPage from './pages/admin/DashboardPage'
import SurveysPage from './pages/admin/SurveysPage'
import CreateSurveyPage from './pages/admin/surveys/CreateSurveyPage'
import EditSurveyPage from './pages/admin/surveys/EditSurveyPage'
import CodeBatchesPage from './pages/admin/CodeBatchesPage'
import ProductCodesPage from './pages/admin/product-codes/ProductCodesPage'
import SurveyResponsesPage from './pages/admin/survey-responses/SurveyResponsesPage'
import SurveyResponseDetailPage from './pages/admin/survey-responses/SurveyResponseDetailPage'
import SettingsPage from './pages/admin/settings/SettingsPage'
import AdminLoginPage from './pages/admin/LoginPage'

/**
 * Configuración de rutas de la aplicación
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <div>Página de inicio pública</div>,
  },
  {
    path: '/survey/:slug',
    element: <SurveyPage />,
  },
  {
    path: '/auth/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/register',
    element: <RegisterPage />,
  },
  {
    path: '/auth/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/auth/update-password',
    element: <UpdatePasswordPage />,
  },
  {
    path: '/auth/verify',
    element: <VerifyEmailPage />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },
  {
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
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
            path: 'surveys/new',
            element: <CreateSurveyPage />,
          },
          {
            path: 'surveys/:id/edit',
            element: <EditSurveyPage />,
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
            path: 'survey-responses/:id',
            element: <SurveyResponseDetailPage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
        ],
      }
    ]
  },
  {
    path: '*',
    element: <div>Página no encontrada</div>,
  },
])
