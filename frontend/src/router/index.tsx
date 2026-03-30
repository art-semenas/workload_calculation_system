import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import AppLayout from '../components/layout/AppLayout'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import ObjectListPage from '../pages/ObjectListPage'
import ObjectDetailPage from '../pages/ObjectDetailPage'
import EngineerListPage from '../pages/EngineerListPage'
import EngineerDetailPage from '../pages/EngineerDetailPage'
import SvodPage from '../pages/SvodPage'
import DivisionListPage from '../pages/DivisionListPage'
import DivisionDetailPage from '../pages/DivisionDetailPage'
import BranchDetailPage from '../pages/BranchDetailPage'

// eslint-disable-next-line react-refresh/only-export-components
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/objects', element: <ObjectListPage /> },
      { path: '/objects/new', element: <ObjectDetailPage /> },
      { path: '/objects/:id', element: <ObjectDetailPage /> },
      { path: '/objects/:id/edit', element: <ObjectDetailPage /> },
      { path: '/engineers', element: <EngineerListPage /> },
      { path: '/engineers/:id', element: <EngineerDetailPage /> },
      { path: '/engineers/:id/edit', element: <EngineerDetailPage /> },
      { path: '/svod', element: <SvodPage /> },
      { path: '/svod/export', element: <SvodPage /> },
      { path: '/divisions', element: <DivisionListPage /> },
      { path: '/divisions/:id', element: <DivisionDetailPage /> },
      { path: '/branches/:id', element: <BranchDetailPage /> },
    ],
  },
])
