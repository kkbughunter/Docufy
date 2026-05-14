import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  Code2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  RotateCcw,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { API_BASE_URL, getErrorMessage, groupsApi } from '../api/client'
import { JsonViewer } from '../components/JsonViewer'
import { TestPanel } from '../components/TestPanel'
import { Button, ErrorMessage, Panel, StatusBadge } from '../components/ui'
import { formatDate, getGroupStatus, maskApiKey } from '../lib/utils'

type SnippetTab = 'cURL' | 'Python' | 'JavaScript'

const snippetTabs: SnippetTab[] = ['cURL', 'Python', 'JavaScript']

function buildSnippet(tab: SnippetTab, endpoint: string, apiKey: string) {
  if (tab === 'Python') {
    return `import requests

response = requests.post(
    "${endpoint}",
    headers={"X-API-Key": "${apiKey}"},
    files={"file": open("document.pdf", "rb")},
)

print(response.json())`
  }

  if (tab === 'JavaScript') {
    return `const formData = new FormData();
formData.append("file", fileInput.files[0]);

const response = await fetch("${endpoint}", {
  method: "POST",
  headers: {
    "X-API-Key": "${apiKey}",
  },
  body: formData,
});

const result = await response.json();
console.log(result);`
  }

  return `curl -X POST "${endpoint}" \\
  -H "X-API-Key: ${apiKey}" \\
  -F "file=@document.pdf"`
}

export function GroupDetail() {
  const { groupId } = useParams()
  const queryClient = useQueryClient()
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SnippetTab>('cURL')

  const groupQuery = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => groupsApi.get(groupId ?? ''),
    enabled: Boolean(groupId),
  })

  const rotateKey = useMutation({
    mutationFn: () => groupsApi.rotateKey(groupId ?? ''),
    onSuccess: (updatedGroup) => {
      queryClient.setQueryData(['groups', groupId], updatedGroup)
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setShowKey(true)
    },
  })

  const group = groupQuery.data
  const endpoint = group ? `${API_BASE_URL}/extract/${group.id}` : ''
  const apiKey = group?.api_key ?? ''
  const visibleKey = showKey && apiKey ? apiKey : maskApiKey(apiKey)
  const snippetApiKey = showKey && apiKey ? apiKey : '<YOUR_API_KEY>'
  const snippet = useMemo(
    () => buildSnippet(activeTab, endpoint, snippetApiKey),
    [activeTab, endpoint, snippetApiKey],
  )

  async function copyText(label: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(null), 1600)
  }

  if (!groupId) {
    return <ErrorMessage>Missing group id.</ErrorMessage>
  }

  if (groupQuery.isLoading) {
    return (
      <div className="grid gap-4">
        <div className="h-16 animate-pulse rounded-lg bg-white" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="h-96 animate-pulse rounded-lg bg-white" />
          <div className="h-96 animate-pulse rounded-lg bg-white" />
        </div>
      </div>
    )
  }

  if (groupQuery.isError) {
    return <ErrorMessage>{getErrorMessage(groupQuery.error)}</ErrorMessage>
  }

  if (!group) {
    return <ErrorMessage>Group not found.</ErrorMessage>
  }

  const status = getGroupStatus(group)

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Dashboard
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{group.name}</h1>
            <StatusBadge tone={status === 'Active' ? 'success' : 'warning'}>{status}</StatusBadge>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {group.description || 'No description added.'}
          </p>
        </div>
        <Link
          to={`/groups/${group.id}/edit`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
        >
          <Pencil size={16} aria-hidden="true" />
          Edit Group
        </Link>
      </div>

      {rotateKey.isError ? <ErrorMessage>{getErrorMessage(rotateKey.error)}</ErrorMessage> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="grid content-start gap-6">
          <Panel title="Group Info">
            <dl className="grid gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Document Type</dt>
                <dd className="mt-1 font-medium text-slate-950">{group.document_type || 'Custom'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Language</dt>
                <dd className="mt-1 font-medium text-slate-950">{group.language_hint || 'Other'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="mt-1 font-medium text-slate-950">{formatDate(group.created_at)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Document Description</dt>
                <dd className="mt-1 leading-6 text-slate-700">
                  {group.document_hint || 'No document hint added.'}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Output Schema">
            <JsonViewer data={group.output_schema} title="Schema" />
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel title="Test Panel" description="Upload a document and inspect the live response.">
            <TestPanel groupId={group.id} />
          </Panel>

          <Panel title="API Info">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <span className="text-sm font-medium text-slate-800">Endpoint</span>
                <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <code className="truncate text-xs text-slate-700">{endpoint}</code>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyText('endpoint', endpoint)}
                  >
                    {copied === 'endpoint' ? (
                      <Check size={14} aria-hidden="true" />
                    ) : (
                      <Copy size={14} aria-hidden="true" />
                    )}
                    Copy
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <span className="text-sm font-medium text-slate-800">Auth Header</span>
                <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <KeyRound size={16} className="text-slate-500" aria-hidden="true" />
                  <code className="min-w-0 flex-1 truncate text-xs text-slate-700">
                    X-API-Key: {visibleKey}
                  </code>
                  <Button size="sm" variant="secondary" onClick={() => setShowKey((value) => !value)}>
                    {showKey ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                    {showKey ? 'Hide' : 'Reveal'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!apiKey}
                    onClick={() => copyText('api-key', apiKey)}
                  >
                    {copied === 'api-key' ? (
                      <Check size={14} aria-hidden="true" />
                    ) : (
                      <Copy size={14} aria-hidden="true" />
                    )}
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={rotateKey.isPending}
                    onClick={() => rotateKey.mutate()}
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    {rotateKey.isPending ? 'Rotating...' : 'Rotate'}
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
                    <Code2 size={16} aria-hidden="true" />
                    Code Snippet
                  </span>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                    {snippetTabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                          activeTab === tab
                            ? 'bg-white text-slate-950 shadow-sm'
                            : 'text-slate-500 hover:text-slate-950'
                        }`}
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
                  <div className="flex justify-end border-b border-slate-800 px-3 py-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                      onClick={() => copyText('snippet', snippet)}
                    >
                      {copied === 'snippet' ? (
                        <Check size={14} aria-hidden="true" />
                      ) : (
                        <Copy size={14} aria-hidden="true" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <pre className="app-scrollbar max-h-72 overflow-auto p-4 text-xs leading-5 text-emerald-100">
                    <code>{snippet}</code>
                  </pre>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
