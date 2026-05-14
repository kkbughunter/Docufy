import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Clock3, Layers3, Sparkles, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { billingApi, getErrorMessage, groupsApi, usageApi } from '../api/client'
import { ErrorMessage, Panel, StatusBadge } from '../components/ui'
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPlanPrice,
  getHistoryTone,
} from '../lib/utils'

export function Dashboard() {
  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: groupsApi.list,
  })
  const usageSummaryQuery = useQuery({
    queryKey: ['usage', 'summary'],
    queryFn: usageApi.summary,
  })
  const billingSummaryQuery = useQuery({
    queryKey: ['billing', 'summary'],
    queryFn: billingApi.summary,
  })
  const historyQuery = useQuery({
    queryKey: ['usage', 'history', 'dashboard'],
    queryFn: () => usageApi.history({ limit: 6 }),
  })

  const usageSummary = usageSummaryQuery.data
  const billingSummary = billingSummaryQuery.data
  const groups = groupsQuery.data ?? []
  const history = historyQuery.data ?? []
  const successRate =
    usageSummary && usageSummary.totals.total_calls > 0
      ? Math.round((usageSummary.totals.success_calls / usageSummary.totals.total_calls) * 100)
      : 0

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Keep your extraction APIs moving
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Track plan capacity, request health, and group activity from one place while the
            workspace handles token refresh in the background.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/groups"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
          >
            View Groups
          </Link>
          <Link
            to="/billing"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-950 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Manage Billing
          </Link>
        </div>
      </div>

      {groupsQuery.isError ? <ErrorMessage>{getErrorMessage(groupsQuery.error)}</ErrorMessage> : null}
      {usageSummaryQuery.isError ? (
        <ErrorMessage>{getErrorMessage(usageSummaryQuery.error)}</ErrorMessage>
      ) : null}
      {billingSummaryQuery.isError ? (
        <ErrorMessage>{getErrorMessage(billingSummaryQuery.error)}</ErrorMessage>
      ) : null}
      {historyQuery.isError ? <ErrorMessage>{getErrorMessage(historyQuery.error)}</ErrorMessage> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel className="h-full">
          <div className="grid gap-3">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Current Plan</span>
              <Sparkles size={16} aria-hidden="true" />
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-950">
                {billingSummary?.current_plan.name ?? 'Trial'}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {billingSummary
                  ? formatPlanPrice(
                      billingSummary.current_plan.price_usd,
                      billingSummary.current_plan.interval_label,
                    )
                  : 'Loading...'}
              </div>
            </div>
            {billingSummary ? (
              <StatusBadge tone="neutral">{billingSummary.billing_status}</StatusBadge>
            ) : null}
          </div>
        </Panel>

        <Panel className="h-full">
          <div className="grid gap-3">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Requests Used</span>
              <TrendingUp size={16} aria-hidden="true" />
            </div>
            <div className="text-xl font-semibold text-slate-950">
              {usageSummary ? formatNumber(usageSummary.totals.requests_used) : '...'}
            </div>
            <div className="text-sm text-slate-500">
              {usageSummary?.limits.max_monthly_requests != null
                ? `${formatNumber(usageSummary.requests_remaining ?? 0)} remaining this period`
                : 'Unlimited on current plan'}
            </div>
          </div>
        </Panel>

        <Panel className="h-full">
          <div className="grid gap-3">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Success Rate</span>
              <Clock3 size={16} aria-hidden="true" />
            </div>
            <div className="text-xl font-semibold text-slate-950">{successRate}%</div>
            <div className="text-sm text-slate-500">
              Avg latency{' '}
              {usageSummary ? formatDuration(usageSummary.totals.average_duration_ms) : '...'}
            </div>
          </div>
        </Panel>

        <Panel className="h-full">
          <div className="grid gap-3">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>API Groups</span>
              <Layers3 size={16} aria-hidden="true" />
            </div>
            <div className="text-xl font-semibold text-slate-950">{formatNumber(groups.length)}</div>
            <div className="text-sm text-slate-500">
              {usageSummary?.limits.max_groups != null
                ? `${usageSummary.groups_remaining ?? 0} slots available`
                : 'Unlimited groups on current plan'}
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Panel
          title="Latest Activity"
          description="Most recent extraction requests across your API groups."
          action={
            <Link
              to="/history"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
            >
              Full History
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          {history.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">
              No extraction activity yet. Run a test from any API group and it will show up here.
            </div>
          ) : (
            <div className="grid gap-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-950">
                        {entry.group_name ?? 'Unknown Group'}
                      </span>
                      <StatusBadge tone={getHistoryTone(entry.status_code)}>
                        {entry.status_code}
                      </StatusBadge>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {entry.endpoint_path} · {formatDateTime(entry.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span>{formatDuration(entry.duration_ms)}</span>
                    <span className="capitalize">{entry.auth_mode}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="This Billing Window"
          description="The active window that Docufy uses for strict request enforcement."
        >
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Window Start</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {usageSummary ? formatDate(usageSummary.window.started_at) : 'Loading...'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Window End</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {usageSummary ? formatDate(usageSummary.window.ends_at) : 'Loading...'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Failed or Blocked Calls</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {usageSummary
                  ? formatNumber(
                      usageSummary.totals.failed_calls + usageSummary.totals.blocked_calls,
                    )
                  : 'Loading...'}
              </dd>
            </div>
          </dl>
        </Panel>
      </section>

      <Panel
        title="Recent Groups"
        description="Jump back into the APIs you’ve been shaping most recently."
        action={
          <Link
            to="/groups"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
          >
            Open Groups
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        }
      >
        {groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">
            No groups yet. Create your first API group to define a schema and test live extraction.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {groups.slice(0, 4).map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="rounded-lg border border-slate-200 px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="text-base font-semibold text-slate-950">{group.name}</div>
                <div className="mt-1 text-sm text-slate-500">{group.document_type}</div>
                <div className="mt-3 text-xs text-slate-500">
                  Created {formatDate(group.created_at)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
