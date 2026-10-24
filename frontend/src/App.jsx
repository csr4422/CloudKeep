import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { StorageAccountsPage } from '@/pages/StorageAccountsPage'
import { WorkspacePage } from '@/pages/WorkspacePage'

function HomeRedirect() {
  const { isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? '/app' : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<WorkspacePage />} />
        <Route path="/app/storage" element={<StorageAccountsPage />} />
      </Route>
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
