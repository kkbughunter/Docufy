import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { BillingPage } from './pages/BillingPage'
import { BillingReturn } from './pages/BillingReturn'
import { useAuthStore } from './store/authStore'
import { Dashboard } from './pages/Dashboard'
import { GoogleOAuthCallback } from './pages/GoogleOAuthCallback'
import { GroupCreate } from './pages/GroupCreate'
import { GroupDetail } from './pages/GroupDetail'
import { GroupsPage } from './pages/GroupsPage'
import { HistoryPage } from './pages/HistoryPage'
import { LandingPage } from './pages/LandingPage'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'
import { Register } from './pages/Register'
import { UsagePage } from './pages/UsagePage'

function PublicRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)

  return accessToken ? <Navigate to="/dashboard" replace /> : <Outlet />
}

function ProtectedRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)

  return accessToken ? <Outlet /> : <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/oauth/google/callback" element={<GoogleOAuthCallback />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/new" element={<GroupCreate mode="create" />} />
          <Route path="/groups/:groupId" element={<GroupDetail />} />
          <Route path="/groups/:groupId/edit" element={<GroupCreate mode="edit" />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/billing/return" element={<BillingReturn />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
