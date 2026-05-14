import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { useAuthStore } from './store/authStore'
import { Dashboard } from './pages/Dashboard'
import { GoogleOAuthCallback } from './pages/GoogleOAuthCallback'
import { GroupCreate } from './pages/GroupCreate'
import { GroupDetail } from './pages/GroupDetail'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'
import { Register } from './pages/Register'

function RootRedirect() {
  const accessToken = useAuthStore((state) => state.accessToken)

  return <Navigate to={accessToken ? '/dashboard' : '/login'} replace />
}

function PublicRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)

  return accessToken ? <Navigate to="/dashboard" replace /> : <Outlet />
}

function ProtectedRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)

  return accessToken ? <Outlet /> : <Navigate to="/login" replace />
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-950">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/oauth/google/callback" element={<GoogleOAuthCallback />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/groups/new" element={<GroupCreate mode="create" />} />
          <Route path="/groups/:groupId" element={<GroupDetail />} />
          <Route path="/groups/:groupId/edit" element={<GroupCreate mode="edit" />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
