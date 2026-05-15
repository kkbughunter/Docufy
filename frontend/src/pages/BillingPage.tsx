import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowRight, BadgeDollarSign, CreditCard, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { billingApi, getErrorMessage } from '../api/client'
import { Button, ErrorMessage, Panel, StatusBadge } from '../components/ui'
import { formatDate, formatPlanPrice } from '../lib/utils'

export function BillingPage() {
  const billingSummaryQuery = useQuery({
    queryKey: ['billing', 'summary'],
    queryFn: billingApi.summary,
  })

  const startCheckout = useMutation({
    mutationFn: billingApi.startCheckout,
    onSuccess: (payload) => {
      window.location.assign(payload.checkout_url)
    },
  })

  const startPortal = useMutation({
    mutationFn: billingApi.startPortal,
    onSuccess: (payload) => {
      window.location.assign(payload.portal_url)
    },
  })

  const summary = billingSummaryQuery.data

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Billing</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            USD recharge plans
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {summary?.dodo_customer_id ? (
            <Button
              variant="secondary"
              onClick={() => startPortal.mutate()}
              disabled={startPortal.isPending}
            >
              <ExternalLink size={16} aria-hidden="true" />
              {startPortal.isPending ? 'Opening...' : 'Open Customer Portal'}
            </Button>
          ) : null}
          <Link
            to="/usage"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-950 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <ArrowRight size={16} aria-hidden="true" />
            Review Usage
          </Link>
        </div>
      </div>

      {billingSummaryQuery.isError ? (
        <ErrorMessage>{getErrorMessage(billingSummaryQuery.error)}</ErrorMessage>
      ) : null}
      {startCheckout.isError ? <ErrorMessage>{getErrorMessage(startCheckout.error)}</ErrorMessage> : null}
      {startPortal.isError ? <ErrorMessage>{getErrorMessage(startPortal.error)}</ErrorMessage> : null}

      <Panel title="Current Plan" description="">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">
                {summary?.current_plan.name ?? 'Loading...'}
              </h2>
              {summary ? <StatusBadge tone="neutral">{summary.billing_status}</StatusBadge> : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {summary?.current_plan.description ?? 'Loading billing details...'}
            </p>
          </div>
          <div className="grid gap-1 text-sm text-slate-600">
            <div>
              Price:{' '}
              <span className="font-medium text-slate-950">
                {summary
                  ? formatPlanPrice(
                      summary.current_plan.price_usd,
                      summary.current_plan.interval_label,
                    )
                  : 'Loading...'}
              </span>
            </div>
            <div>
              Last Successful Purchase:{' '}
              <span className="font-medium text-slate-950">
                {summary?.last_successful_purchase_at
                  ? formatDate(summary.last_successful_purchase_at)
                  : 'Not available'}
              </span>
            </div>
            <div>
              Last Failed Attempt:{' '}
              <span className="font-medium text-slate-950">
                {summary?.last_failed_purchase_at
                  ? formatDate(summary.last_failed_purchase_at)
                  : 'None'}
              </span>
            </div>
          </div>
        </div>
      </Panel>

      <section className="grid gap-4 xl:grid-cols-4">
        {(summary?.public_plans ?? []).map((plan) => {
          const isCurrent = summary?.current_plan.key === plan.key

          return (
            <article
              key={plan.key}
              className={`grid gap-5 rounded-lg border bg-white p-5 shadow-sm ${
                plan.highlighted ? 'border-slate-950' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{plan.name}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{plan.description}</p>
                </div>
                {plan.highlighted ? <StatusBadge tone="success">Popular</StatusBadge> : null}
              </div>

              <div>
                <div className="text-3xl font-semibold text-slate-950">
                  {formatPlanPrice(plan.price_usd, plan.interval_label)}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {plan.contact_only ? 'Custom rollout' : 'One-time recharge in USD'}
                </div>
              </div>

              <ul className="grid gap-2 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="leading-6">
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {plan.contact_only ? (
                  <a
                    href={plan.cta_href ?? 'mailto:sales@docufy.ai'}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    <BadgeDollarSign size={16} aria-hidden="true" />
                    {plan.cta_label}
                  </a>
                ) : (
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'secondary' : 'primary'}
                    disabled={startCheckout.isPending || isCurrent}
                    onClick={() => startCheckout.mutate(plan.key)}
                  >
                    <CreditCard size={16} aria-hidden="true" />
                    {isCurrent ? 'Current Plan' : plan.cta_label}
                  </Button>
                )}
              </div>
            </article>
          )
        })}
      </section>

      <Panel title="Recent Billing Events" description="Latest purchase and payment updates from Dodo webhooks.">
        {(summary?.recent_events ?? []).length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">
            No billing events yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {(summary?.recent_events ?? []).map((event) => (
              <div
                key={`${event.event_type}-${event.created_at}-${event.payment_id ?? event.subscription_id ?? 'evt'}`}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-slate-950">
                    {event.plan_name ?? event.plan_key ?? 'Plan'} · {event.event_type}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {formatDate(event.created_at)}
                    {event.failure_reason ? ` · ${event.failure_reason}` : ''}
                  </div>
                </div>
                <StatusBadge
                  tone={
                    event.status === 'active'
                      ? 'success'
                      : event.status.includes('failed')
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {event.status}
                </StatusBadge>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
