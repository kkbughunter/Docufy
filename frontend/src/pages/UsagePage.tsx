import { useQuery } from '@tanstack/react-query'
import { Activity, FolderKanban, Gauge, Sparkles } from 'lucide-react'
import { getErrorMessage, usageApi } from '../api/client'
import { ErrorMessage, Panel, StatusBadge } from '../components/ui'
import { formatDate, formatDuration, formatNumber } from '../lib/utils'

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string
  used: number
  limit?: number | null
}) {
  const percentage = limit ? Math.min((used / limit) * 100, 100) : 0

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-900">{label}</span>
        <span className="text-slate-500">
          {formatNumber(used)}
          {limit != null ? ` / ${formatNumber(limit)}` : ' / Unlimited'}
        </span>
      </div>
      {limit != null ? (
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-slate-950"
            style={{ width: `${Math.max(percentage, used > 0 ? 4 : 0)}%` }}
          />
        </div>
      ) : (
        <div className="h-2 rounded-full bg-slate-100">
          <div className="h-2 w-1/3 rounded-full bg-slate-950" />
        </div>
      )}
    </div>
  )
}

export function UsagePage() {
  const usageSummaryQuery = useQuery({
    queryKey: ['usage', 'summary'],
    queryFn: usageApi.summary,
  })

  const usage = usageSummaryQuery.data
  const dailyCost = usage?.daily_usage_cost ?? []
  const maxDailyCost = Math.max(...dailyCost.map((point) => point.cost_usd), 0)

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Usage</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          Recharge usage tracking
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Request and group limits are checked before Docufy calls Claude. Limits stay in effect
          until you recharge.
        </p>
      </div>

      {usageSummaryQuery.isError ? (
        <ErrorMessage>{getErrorMessage(usageSummaryQuery.error)}</ErrorMessage>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel className="h-full">
          <div className="grid gap-3">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Plan</span>
              <Sparkles size={16} aria-hidden="true" />
            </div>
            <div className="text-xl font-semibold text-slate-950">{usage?.plan_key ?? '...'}</div>
            <StatusBadge tone="neutral">{usage?.billing_status ?? 'loading'}</StatusBadge>
          </div>
        </Panel>

        <Panel className="h-full">
          <div className="grid gap-3">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Groups Used</span>
              <FolderKanban size={16} aria-hidden="true" />
            </div>
            <div className="text-xl font-semibold text-slate-950">
              {usage ? formatNumber(usage.groups_used) : '...'}
            </div>
            <div className="text-sm text-slate-500">
              {usage?.limits.max_groups != null
                ? `${usage.groups_remaining ?? 0} available`
                : 'Unlimited groups'}
            </div>
          </div>
        </Panel>

        <Panel className="h-full">
          <div className="grid gap-3">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Average Latency</span>
              <Gauge size={16} aria-hidden="true" />
            </div>
            <div className="text-xl font-semibold text-slate-950">
              {usage ? formatDuration(usage.totals.average_duration_ms) : '...'}
            </div>
            <div className="text-sm text-slate-500">
              Across {usage ? formatNumber(usage.totals.total_calls) : '...'} total requests
            </div>
          </div>
        </Panel>

        <Panel className="h-full">
          <div className="grid gap-3">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Failures + Blocks</span>
              <Activity size={16} aria-hidden="true" />
            </div>
            <div className="text-xl font-semibold text-slate-950">
              {usage
                ? formatNumber(usage.totals.failed_calls + usage.totals.blocked_calls)
                : '...'}
            </div>
            <div className="text-sm text-slate-500">
              Requests rejected or returned an error
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Panel
          title="Capacity"
          description="How much of your current recharge capacity has been consumed."
        >
          {usage ? (
            <div className="grid gap-5">
              <UsageBar
                label="Extraction Requests"
                used={usage.totals.requests_used}
                limit={usage.limits.max_requests}
              />
              <UsageBar
                label="API Groups"
                used={usage.groups_used}
                limit={usage.limits.max_groups}
              />
            </div>
          ) : (
            <div className="h-36 animate-pulse rounded-lg bg-slate-100" />
          )}
        </Panel>

        <Panel title="Recharge Cycle" description="Current usage cycle used for limit checks.">
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Cycle Start</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {usage ? formatDate(usage.window.started_at) : 'Loading...'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Cycle End</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {usage?.window.ends_at ? formatDate(usage.window.ends_at) : 'On next recharge'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Max File Size</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {usage?.limits.max_file_size_mb != null
                  ? `${usage.limits.max_file_size_mb} MB`
                  : 'Custom'}
              </dd>
            </div>
          </dl>
        </Panel>
      </section>

      <Panel
        title="Daily usage cost"
        description="Last 30 days estimated usage cost in USD (x: day, y: USD)."
      >
        {dailyCost.length === 0 ? (
          <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <div className="grid gap-3">
            <div className="flex h-44 items-end gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-3">
              {dailyCost.map((point) => {
                const height = maxDailyCost > 0 ? Math.max((point.cost_usd / maxDailyCost) * 100, point.cost_usd > 0 ? 4 : 0) : 0
                const day = new Date(point.date).getDate()
                return (
                  <div key={point.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end">
                    <div
                      className="w-full rounded-sm bg-slate-900 transition group-hover:bg-slate-700"
                      style={{ height: `${height}%` }}
                      title={`$${point.cost_usd.toFixed(4)} · ${point.requests_used} calls`}
                    />
                    <span className="mt-1 text-[10px] text-slate-500">{day}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{dailyCost[0] ? formatDate(dailyCost[0].date) : ''}</span>
              <span>Today</span>
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}
