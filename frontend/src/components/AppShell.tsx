import { useQuery } from '@tanstack/react-query'
import {
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { billingApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { cn } from '../lib/utils'
import { Button, IconButton, StatusBadge } from './ui'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/groups', label: 'Groups', icon: Workflow },
  { to: '/usage', label: 'Usage', icon: Sparkles },
  { to: '/history', label: 'History', icon: History },
  { to: '/billing', label: 'Billing', icon: CreditCard },
]

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="grid gap-1">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'inline-flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition',
                isActive
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-600 hover:bg-white hover:text-slate-950',
              )
            }
          >
            <Icon size={17} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export function AppShell() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const billingSummaryQuery = useQuery({
    queryKey: ['billing', 'summary'],
    queryFn: billingApi.summary,
  })

  const planLabel = useMemo(() => {
    return billingSummaryQuery.data?.current_plan.name ?? 'Trial'
  }, [billingSummaryQuery.data])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 py-5">
        <Link to="/dashboard" className="flex items-center gap-3 text-slate-950">
          <span className="inline-flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Workflow size={19} aria-hidden="true" />
          </span>
          <div>
            <div className="text-base font-semibold">Docufy</div>
            <div className="text-xs text-slate-500">Document extraction workspace</div>
          </div>
        </Link>
      </div>

      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900">{user?.email}</div>
            <div className="mt-1 text-xs text-slate-500">Current plan</div>
          </div>
          <StatusBadge tone="neutral">{planLabel}</StatusBadge>
        </div>
        <Link
          to="/groups/new"
          onClick={() => setMenuOpen(false)}
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-950 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Plus size={16} aria-hidden="true" />
          New Group
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavList onNavigate={() => setMenuOpen(false)} />
      </div>

      <div className="border-t border-slate-200 px-4 py-4">
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut size={16} aria-hidden="true" />
          Logout
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-stone-100 lg:block">
        {sidebar}
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" onClick={() => setMenuOpen(false)}>
          <div
            className="h-full w-72 border-r border-slate-200 bg-stone-100"
            onClick={(event) => event.stopPropagation()}
          >
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-stone-50/90 backdrop-blur">
          <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <IconButton className="lg:hidden" onClick={() => setMenuOpen(true)}>
                <Menu size={16} aria-hidden="true" />
              </IconButton>
              <div>
                <div className="text-sm font-medium text-slate-500">Workspace</div>
                <div className="text-base font-semibold text-slate-950">Docufy Control Plane</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge tone="neutral">{planLabel}</StatusBadge>
              <Button size="sm" onClick={() => navigate('/groups/new')}>
                <Plus size={16} aria-hidden="true" />
                New Group
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
