import { CheckCircle2, XCircle } from 'lucide-react'
import { useMemo } from 'react'
import { schemaTemplates } from '../lib/schemaTemplates'
import { parseSchema } from '../lib/schemaValidation'
import { Button, Textarea } from './ui'

type SchemaEditorProps = {
  value: string
  onChange: (value: string) => void
}

export function SchemaEditor({ value, onChange }: SchemaEditorProps) {
  const validation = useMemo(() => parseSchema(value), [value])

  return (
    <div className="grid gap-3">
            <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={18}
        spellCheck={false}
        className="app-scrollbar min-h-96 resize-y font-mono text-xs leading-5"
      />

      <div className="flex min-h-6 items-start gap-2 text-sm">
        {validation.ok ? (
          <>
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span className="text-emerald-700">Valid JSON object</span>
          </>
        ) : (
          <>
            <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden="true" />
            <span className="text-rose-700">{validation.error}</span>
          </>
        )}
      </div>
    </div>
  )
}
