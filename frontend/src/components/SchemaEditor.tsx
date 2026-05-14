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

  function applyTemplate(templateName: keyof typeof schemaTemplates) {
    onChange(JSON.stringify(schemaTemplates[templateName], null, 2))
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-800">Define JSON output structure</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Use string, number, date, boolean, and [string] as type hints.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(schemaTemplates).map((templateName) => (
            <Button
              key={templateName}
              size="sm"
              variant="secondary"
              onClick={() => applyTemplate(templateName as keyof typeof schemaTemplates)}
            >
              {templateName}
            </Button>
          ))}
        </div>
      </div>

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
