import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { billingApi, getErrorMessage } from '../api/client'
import { ErrorMessage, Panel, StatusBadge } from '../components/ui'

export function BillingReturn() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status')
  const billingSummaryQuery = useQuery({
    queryKey: ['billing', 'summary'],
    queryFn: billingApi.summary,
  })

  const icon =
    status === 'cancelled' ? (
      <XCircle className="size-5 text-rose-600" aria-hidden="true" />
    ) : status === 'success' ? (
      <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
    ) : (
      <Clock3 className="size-5 text-amber-600" aria-hidden="true" />
    )

  return (
    <div className="grid gap-6">
      {billingSummaryQuery.isError ? (
        <ErrorMessage>{getErrorMessage(billingSummaryQuery.error)}</ErrorMessage>
      ) : null}

      <Panel title="Billing Return" description="Dodo redirected you back here after checkout.">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            {icon}
            <div>
              <div className="text-lg font-semibold text-slate-950">
                {status === 'cancelled'
                  ? 'Checkout was cancelled'
                  : 'We are syncing your recharge'}
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Redirect params are only a user-facing signal. Docufy waits for the Dodo webhook to
                update plan access, so refresh billing in a moment if the recharge has not appeared
                yet.
              </p>
            </div>
          </div>
          {billingSummaryQuery.data ? (
            <StatusBadge tone="neutral">{billingSummaryQuery.data.billing_status}</StatusBadge>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/billing"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-950 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Back to Billing
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Go to Overview
          </Link>
        </div>
      </Panel>
    </div>
  )
}
