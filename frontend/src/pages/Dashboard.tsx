import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileSearch, Plus, RefreshCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getErrorMessage, groupsApi } from '../api/client'
import { GroupCard } from '../components/GroupCard'
import { Button, ErrorMessage, Panel } from '../components/ui'
import type { ApiGroup } from '../types'

export function Dashboard() {
  const queryClient = useQueryClient()
  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: groupsApi.list,
  })

  const deleteGroup = useMutation({
    mutationFn: groupsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  function handleDelete(group: ApiGroup) {
    const shouldDelete = window.confirm(`Delete "${group.name}"? This cannot be undone.`)

    if (shouldDelete) {
      deleteGroup.mutate(group.id)
    }
  }

  const groups = groupsQuery.data ?? []

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">API Groups</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Create document-specific extraction APIs with stable JSON output schemas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => groupsQuery.refetch()}>
            <RefreshCcw size={16} aria-hidden="true" />
            Refresh
          </Button>
          <Link
            to="/groups/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-950 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Plus size={16} aria-hidden="true" />
            New Group
          </Link>
        </div>
      </div>

      {groupsQuery.isError ? <ErrorMessage>{getErrorMessage(groupsQuery.error)}</ErrorMessage> : null}
      {deleteGroup.isError ? <ErrorMessage>{getErrorMessage(deleteGroup.error)}</ErrorMessage> : null}

      {groupsQuery.isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : null}

      {!groupsQuery.isLoading && groups.length === 0 ? (
        <Panel>
          <div className="grid place-items-center gap-4 py-12 text-center">
            <div className="grid size-20 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
              <FileSearch size={34} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Create your first API group</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Define the document context, output schema, and test extraction from one place.
              </p>
            </div>
            <Link
              to="/groups/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-950 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Plus size={16} aria-hidden="true" />
              New Group
            </Link>
          </div>
        </Panel>
      ) : null}

      {groups.length > 0 ? (
        <div className="grid gap-3">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              isDeleting={deleteGroup.isPending && deleteGroup.variables === group.id}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
