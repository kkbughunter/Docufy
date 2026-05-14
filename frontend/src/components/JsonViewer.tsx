import { Check, Copy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { stringifyJson } from '../lib/utils'
import type { JsonValue } from '../types'
import { Button } from './ui'

type JsonViewerProps = {
  data: JsonValue
  title?: string
}

export function JsonViewer({ data, title = 'JSON Output' }: JsonViewerProps) {
  const [copied, setCopied] = useState(false)
  const formatted = useMemo(() => stringifyJson(data), [data])

  async function copyJson() {
    await navigator.clipboard.writeText(formatted)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-3 py-2">
        <span className="truncate text-sm font-medium text-slate-100">{title}</span>
        <Button size="sm" variant="secondary" onClick={copyJson} className="h-8 border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="app-scrollbar max-h-[28rem] overflow-auto p-4 text-xs leading-5 text-emerald-100">
        <code>{formatted}</code>
      </pre>
    </div>
  )
}
