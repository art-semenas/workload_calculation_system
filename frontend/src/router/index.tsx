import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import ObjectListPage from '../pages/ObjectListPage'
import ObjectDetailPage from '../pages/ObjectDetailPage'
import EngineerListPage from '../pages/EngineerListPage'
import EngineerDetailPage from '../pages/EngineerDetailPage'
import SvodPage from '../pages/SvodPage'
import DivisionsListPage from '../pages/DivisionsListPage'
import DivisionDetailPage from '../pages/DivisionDetailPage'
import BranchDetailPage from '../pages/BranchDetailPage'

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
      { path: '/objects/new', element: <ObjectDetailPage mode="create" /> },
      { path: '/objects/:id', element: <ObjectDetailPage mode="detail" /> },
      { path: '/objects/:id/edit', element: <ObjectDetailPage mode="edit" /> },
      { path: '/engineers', element: <EngineerListPage /> },
      { path: '/engineers/:id', element: <EngineerDetailPage /> },
      { path: '/engineers/:id/edit', element: <EngineerDetailPage /> },
      { path: '/svod', element: <SvodPage /> },
      { path: '/svod/export', element: <SvodPage /> },
      { path: '/divisions', element: <DivisionsListPage /> },
      { path: '/divisions/:id', element: <DivisionDetailPage /> },
      { path: '/branches/:id', element: <BranchDetailPage /> },
    ],
  },
])
