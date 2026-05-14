import { useQuery } from '@tanstack/react-query'
import { Filter, History, TimerReset } from 'lucide-react'
import { useState } from 'react'
import { getErrorMessage, groupsApi, usageApi } from '../api/client'
import { ErrorMessage, Panel, Select, StatusBadge } from '../components/ui'
import { formatBytes, formatDateTime, formatDuration, getHistoryTone } from '../lib/utils'

export function HistoryPage() {
  const [groupId, setGroupId] = useState('')
  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: groupsApi.list,
  })
  const historyQuery = useQuery({
    queryKey: ['usage', 'history', groupId || 'all'],
    queryFn: () => usageApi.history({ groupId: groupId || undefined, limit: 100 }),
  })

  const history = historyQuery.data ?? []
  const failedCount = history.filter((entry) => entry.status_code >= 400).length

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">History</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Extraction request history
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            See which API group handled a request, how long it took, what status came back, and
            whether Docufy actually spent an AI call.
          </p>
        </div>
        <div className="grid min-w-56 gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Filter</span>
          <div className="relative">
            <Filter
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Select className="pl-9" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="">All groups</option>
              {(groupsQuery.data ?? []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {groupsQuery.isError ? <ErrorMessage>{getErrorMessage(groupsQuery.error)}</ErrorMessage> : null}
      {historyQuery.isError ? <ErrorMessage>{getErrorMessage(historyQuery.error)}</ErrorMessage> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Panel className="h-full">
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Total Rows</span>
              <History size={16} aria-hidden="true" />
            </div>
            <div className="text-xl font-semibold text-slate-950">{history.length}</div>
          </div>
        </Panel>
        <Panel className="h-full">
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Failed or Blocked</span>
              <TimerReset size={16} aria-hidden="true" />
            </div>
            <div className="text-xl font-semibold text-slate-950">{failedCount}</div>
          </div>
        </Panel>
        <Panel className="h-full">
          <div className="grid gap-2">
            <div className="text-sm text-slate-500">Latest Request</div>
            <div className="text-sm font-medium text-slate-950">
              {history[0] ? formatDateTime(history[0].created_at) : 'No history yet'}
            </div>
          </div>
        </Panel>
      </section>

      <Panel title="Recent Requests" description="Newest first, across your selected API scope.">
        {history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">
            No matching history yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="grid gap-3 rounded-lg border border-slate-200 px-4 py-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.7fr)] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-950">
                      {entry.group_name ?? 'Unknown Group'}
                    </span>
                    <StatusBadge tone={getHistoryTone(entry.status_code)}>
                      {entry.status_code}
                    </StatusBadge>
                    {!entry.used_ai_call ? <StatusBadge tone="warning">Blocked before AI</StatusBadge> : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {entry.endpoint_path} · {entry.http_method} · {formatDateTime(entry.created_at)}
                  </div>
                  {entry.error_message ? (
                    <div className="mt-2 text-sm text-rose-600">{entry.error_message}</div>
                  ) : null}
                </div>

                <dl className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">Latency</dt>
                    <dd className="font-medium text-slate-900">{formatDuration(entry.duration_ms)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">Auth</dt>
                    <dd className="font-medium capitalize text-slate-900">{entry.auth_mode}</dd>
                  </div>
                </dl>

                <dl className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">File</dt>
                    <dd className="truncate font-medium text-slate-900">
                      {entry.file_name ?? 'Unknown'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">Size</dt>
                    <dd className="font-medium text-slate-900">
                      {entry.file_size_bytes ? formatBytes(entry.file_size_bytes) : 'Not captured'}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
