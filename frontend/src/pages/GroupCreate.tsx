import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getErrorMessage, groupsApi } from '../api/client'
import { DocTypeSelector } from '../components/DocTypeSelector'
import { SchemaEditor } from '../components/SchemaEditor'
import { Button, ErrorMessage, Field, Input, Panel, Textarea } from '../components/ui'
import { documentTypes, languageHints } from '../lib/options'
import { defaultSchemaText, schemaTemplateForDocumentType } from '../lib/schemaTemplates'
import { parseSchema } from '../lib/schemaValidation'
import type { ApiGroup, DocumentType, GroupPayload, LanguageHint } from '../types'

type GroupCreateProps = {
  mode: 'create' | 'edit'
}

type FormState = {
  name: string
  description: string
  document_type: DocumentType
  document_hint: string
  language_hint: LanguageHint
  schemaText: string
}

const initialForm: FormState = {
  name: '',
  description: '',
  document_type: 'Resume',
  document_hint: '',
  language_hint: 'English',
  schemaText: defaultSchemaText,
}

function normalizeDocumentType(value?: string | null): DocumentType {
  return documentTypes.includes(value as DocumentType) ? (value as DocumentType) : 'Custom'
}

function normalizeLanguageHint(value?: string | null): LanguageHint {
  return languageHints.includes(value as LanguageHint) ? (value as LanguageHint) : 'Other'
}

function getInitialForm(group?: ApiGroup): FormState {
  if (!group) {
    return { ...initialForm }
  }

  return {
    name: group.name,
    description: group.description ?? '',
    document_type: normalizeDocumentType(group.document_type),
    document_hint: group.document_hint ?? '',
    language_hint: normalizeLanguageHint(group.language_hint),
    schemaText: JSON.stringify(group.output_schema, null, 2),
  }
}

export function GroupCreate({ mode }: GroupCreateProps) {
  const { groupId } = useParams()
  const isEditMode = mode === 'edit'

  const groupQuery = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => groupsApi.get(groupId ?? ''),
    enabled: isEditMode && Boolean(groupId),
  })

  if (isEditMode && groupQuery.isLoading) {
    return (
      <div className="grid gap-4">
        <div className="h-20 animate-pulse rounded-lg bg-white" />
        <div className="h-64 animate-pulse rounded-lg bg-white" />
        <div className="h-96 animate-pulse rounded-lg bg-white" />
      </div>
    )
  }

  if (isEditMode && groupQuery.isError) {
    return <ErrorMessage>{getErrorMessage(groupQuery.error)}</ErrorMessage>
  }

  return (
    <GroupForm
      key={isEditMode ? groupQuery.data?.id ?? 'edit' : 'create'}
      mode={mode}
      groupId={groupId}
      initialValue={getInitialForm(groupQuery.data)}
    />
  )
}

function GroupForm({
  mode,
  groupId,
  initialValue,
}: GroupCreateProps & { groupId?: string; initialValue: FormState }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(initialValue)
  const [formError, setFormError] = useState<string | null>(null)
  const isEditMode = mode === 'edit'

  const saveGroup = useMutation({
    mutationFn: (payload: GroupPayload) => {
      if (isEditMode && groupId) {
        return groupsApi.update(groupId, payload)
      }

      return groupsApi.create(payload)
    },
    onSuccess: (group) => {
      if ('api_key' in group && typeof group.api_key === 'string') {
        sessionStorage.setItem(`docufy:group-api-key:${group.id}`, group.api_key)
        sessionStorage.setItem(
          `docufy:group-api-key-notice:${group.id}`,
          'api_key_notice' in group && typeof group.api_key_notice === 'string'
            ? group.api_key_notice
            : 'Download/copy the key now. You will not be able to view it again after closing this window.',
        )
      }
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['groups', group.id] })
      navigate(`/groups/${group.id}`)
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (!form.name.trim()) {
      setFormError('Group name is required.')
      return
    }

    const schema = parseSchema(form.schemaText)

    if (!schema.ok) {
      setFormError(schema.error)
      return
    }

    saveGroup.mutate({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      document_type: form.document_type,
      document_hint: form.document_hint.trim() || undefined,
      language_hint: form.language_hint,
      output_schema: schema.value,
    })
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to={isEditMode && groupId ? `/groups/${groupId}` : '/groups'}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {isEditMode ? 'Edit API Group' : 'Create API Group'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Configure document context and the exact JSON shape Claude should return.
          </p>
        </div>
        <Button type="submit" disabled={saveGroup.isPending}>
          <Save size={16} aria-hidden="true" />
          {saveGroup.isPending ? 'Saving...' : 'Save Group'}
        </Button>
      </div>

      {saveGroup.isError ? <ErrorMessage>{getErrorMessage(saveGroup.error)}</ErrorMessage> : null}
      {formError ? <ErrorMessage>{formError}</ErrorMessage> : null}

      <Panel title="Basic Info">
        <div className="grid gap-4">
          <Field label="Group Name">
            <Input
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Resume Parser"
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={3}
              maxLength={100}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Internal API for extracting candidate data from resumes."
            />
            <p className="mt-1 text-xs text-slate-500">{form.description.length}/100</p>
          </Field>
        </div>
      </Panel>

      <Panel
        title="Document Context"
        description="These hints help the extraction model understand the uploaded document."
      >
        <DocTypeSelector
          value={{
            document_type: form.document_type,
            document_hint: form.document_hint,
            language_hint: form.language_hint,
          }}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              ...value,
              schemaText:
                value.document_type !== current.document_type
                  ? JSON.stringify(schemaTemplateForDocumentType(value.document_type), null, 2)
                  : current.schemaText,
            }))
          }
        />
      </Panel>

      <Panel title="Output Schema">
        <SchemaEditor
          value={form.schemaText}
          onChange={(schemaText) => setForm((current) => ({ ...current, schemaText }))}
        />
      </Panel>
    </form>
  )
}
