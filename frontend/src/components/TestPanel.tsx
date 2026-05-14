import { AlertCircle, FileUp, Loader2, UploadCloud } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { getErrorMessage, groupsApi } from '../api/client'
import { formatBytes } from '../lib/utils'
import { Button, ErrorMessage, StatusBadge } from './ui'
import { JsonViewer } from './JsonViewer'

const maxFileSizeBytes = 10 * 1024 * 1024
const acceptedFileTypes =
  '.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.xls,.csv,.txt,.md,.json,application/pdf,image/png,image/jpeg,image/webp,text/plain,text/csv,application/json'

type TestPanelProps = {
  groupId: string
}

export function TestPanel({ groupId }: TestPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const extraction = useMutation({
    mutationFn: (selectedFile: File) => groupsApi.extract(groupId, selectedFile),
  })

  function selectFile(selectedFile?: File) {
    extraction.reset()

    if (!selectedFile) {
      setFile(null)
      return
    }

    if (selectedFile.size > maxFileSizeBytes) {
      setFile(null)
      setLocalError('File must be 10 MB or smaller.')
      return
    }

    setLocalError(null)
    setFile(selectedFile)
  }

  function runExtraction() {
    if (!file) {
      setLocalError('Choose a document before running extraction.')
      return
    }

    setLocalError(null)
    extraction.mutate(file)
  }

  return (
    <div className="grid gap-4">
      <div
        className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-slate-400"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          selectFile(event.dataTransfer.files[0])
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={acceptedFileTypes}
          onChange={(event) => selectFile(event.target.files?.[0])}
        />
        <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">
          <UploadCloud size={21} aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-900">Upload a document to test</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          PDF, PNG, JPG, DOCX, XLSX, CSV, TXT, MD, or JSON up to 10 MB.
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => inputRef.current?.click()}>
          <FileUp size={16} aria-hidden="true" />
          Choose File
        </Button>
      </div>

      {file ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
            <p className="mt-1 text-xs text-slate-500">{formatBytes(file.size)}</p>
          </div>
          <StatusBadge tone="neutral">{file.type || 'Unknown type'}</StatusBadge>
        </div>
      ) : null}

      {localError ? <ErrorMessage>{localError}</ErrorMessage> : null}
      {extraction.isError ? <ErrorMessage>{getErrorMessage(extraction.error)}</ErrorMessage> : null}

      <Button onClick={runExtraction} disabled={extraction.isPending}>
        {extraction.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <AlertCircle size={16} aria-hidden="true" />
        )}
        {extraction.isPending ? 'Reading document...' : 'Run Extraction'}
      </Button>

      {extraction.data?.success ? (
        <JsonViewer data={extraction.data.data} title="Extraction Result" />
      ) : null}

      {extraction.data && !extraction.data.success ? (
        <ErrorMessage>{extraction.data.error}</ErrorMessage>
      ) : null}
    </div>
  )
}
