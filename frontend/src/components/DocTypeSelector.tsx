import type { DocumentType, LanguageHint } from '../types'
import { documentTypes, languageHints } from '../lib/options'
import { Field, Select, Textarea } from './ui'

type DocContext = {
  document_type: DocumentType
  document_hint: string
  language_hint: LanguageHint
}

type DocTypeSelectorProps = {
  value: DocContext
  onChange: (value: DocContext) => void
}

export function DocTypeSelector({ value, onChange }: DocTypeSelectorProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Document Type">
          <Select
            value={value.document_type}
            onChange={(event) =>
              onChange({ ...value, document_type: event.target.value as DocumentType })
            }
          >
            {documentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Language">
          <Select
            value={value.language_hint}
            onChange={(event) =>
              onChange({ ...value, language_hint: event.target.value as LanguageHint })
            }
          >
            {languageHints.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Document Description">
        <Textarea
          rows={5}
          maxLength={100}
          value={value.document_hint}
          onChange={(event) => onChange({ ...value, document_hint: event.target.value })}
          placeholder="Describe what this document looks like and what fields it usually contains."
        />
        <p className="mt-1 text-xs text-slate-500">{value.document_hint.length}/100</p>
      </Field>
    </div>
  )
}
