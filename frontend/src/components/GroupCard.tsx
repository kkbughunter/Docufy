import { Calendar, FileText, Pencil, Play, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn, formatDate, getGroupStatus } from '../lib/utils'
import type { ApiGroup } from '../types'
import { Button, StatusBadge } from './ui'

type GroupCardProps = {
  group: ApiGroup
  isDeleting?: boolean
  onDelete: (group: ApiGroup) => void
}

export function GroupCard({ group, isDeleting = false, onDelete }: GroupCardProps) {
  const status = getGroupStatus(group)

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-slate-950">{group.name}</h2>
            <StatusBadge tone={status === 'Active' ? 'success' : 'warning'}>{status}</StatusBadge>
          </div>
          {group.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{group.description}</p>
          ) : null}
          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <span className="flex min-w-0 items-center gap-2">
              <FileText size={15} aria-hidden="true" />
              <span className="truncate">{group.document_type || 'Custom'}</span>
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <Calendar size={15} aria-hidden="true" />
              <span className="truncate">{formatDate(group.created_at)}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link
            to={`/groups/${group.id}`}
            className={cn(
              'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50',
            )}
          >
            <Play size={15} aria-hidden="true" />
            Test
          </Link>
          <Link
            to={`/groups/${group.id}/edit`}
            className={cn(
              'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50',
            )}
          >
            <Pencil size={15} aria-hidden="true" />
            Edit
          </Link>
          <Button
            size="sm"
            variant="danger"
            disabled={isDeleting}
            onClick={() => onDelete(group)}
          >
            <Trash2 size={15} aria-hidden="true" />
            Delete
          </Button>
        </div>
      </div>
    </article>
  )
}
