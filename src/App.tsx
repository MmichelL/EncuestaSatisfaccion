import { RouterProvider } from 'react-router-dom'
import { router } from './routes'

/**
 * Componente principal de la aplicación
 * Proporciona el router a toda la aplicación
 */
function App() {
  return <RouterProvider router={router} />
}

export default App
