import { DatabaseZap, LogOut, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from './ui'
import { useAuthStore } from '../store/authStore'

export function Navbar() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link to="/dashboard" className="flex min-w-0 items-center gap-3 text-slate-950">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-slate-950 text-white">
            <DatabaseZap size={19} aria-hidden="true" />
          </span>
          <span className="truncate text-lg font-semibold">Docufy</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {user?.email ? (
            <span className="max-w-56 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {user.email}
            </span>
          ) : null}
          <Button size="sm" onClick={() => navigate('/groups/new')}>
            <Plus size={16} aria-hidden="true" />
            New Group
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut size={16} aria-hidden="true" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
