import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileUp,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { authApi, billingApi, getErrorMessage } from '../api/client'
import { ErrorMessage, StatusBadge } from '../components/ui'
import { formatPlanPrice } from '../lib/utils'
import { useAuthStore } from '../store/authStore'

export function LandingPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const plansQuery = useQuery({
    queryKey: ['billing', 'plans', 'landing'],
    queryFn: billingApi.plans,
  })

  const primaryHref = accessToken ? '/dashboard' : authApi.googleLoginUrl('/dashboard')
  const primaryLabel = accessToken ? 'Open Workspace' : 'Start with Google'

  return (
    <div className="min-h-screen bg-stone-50 text-slate-950">
      <header className="border-b border-slate-200 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 text-slate-950">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Workflow size={19} aria-hidden="true" />
            </span>
            <div>
              <div className="text-base font-semibold">Docufy</div>
              <div className="text-xs text-slate-500">Schema-bound document APIs</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Sign In
            </Link>
            <a
              href={primaryHref}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-950 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              {primaryLabel}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-10 pt-12 sm:px-6 lg:px-8 lg:pt-16">
          <div className="max-w-4xl">
            <StatusBadge tone="neutral">Google OAuth + Dodo Payments + Claude</StatusBadge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Docufy turns your document rules into testable extraction APIs.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
              Create a schema-bound API group, describe the document type, upload a real file, and
              watch Claude return structured JSON without storing the document on the server.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={primaryHref}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-950 bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {primaryLabel}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <a
                href="#pricing"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                View Pricing
              </a>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="grid gap-4">
                <div className="rounded-lg border border-slate-200 bg-stone-50 p-4">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Schema</span>
                    <CheckCircle2 size={15} aria-hidden="true" />
                  </div>
                  <pre className="mt-4 overflow-hidden text-xs leading-6 text-slate-700">{`{
  "invoice_number": "",
  "issue_date": "",
  "vendor_name": "",
  "line_items": []
}`}</pre>
                </div>
                <div className="rounded-lg border border-slate-200 bg-stone-50 p-4">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Document Context</span>
                    <FileUp size={15} aria-hidden="true" />
                  </div>
                  <div className="mt-4 text-sm leading-7 text-slate-700">
                    Type: Invoice
                    <br />
                    Language: Mixed
                    <br />
                    Notes: Vendor invoices with tax fields and table rows.
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 text-slate-100">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>Live Test Response</span>
                  <Sparkles size={15} aria-hidden="true" />
                </div>
                <pre className="mt-4 overflow-auto text-xs leading-6 text-emerald-100">{`{
  "invoice_number": "INV-2048",
  "issue_date": "2026-05-12",
  "vendor_name": "Northline Supplies",
  "line_items": [
    {
      "description": "Packaging material",
      "amount": 148.5
    }
  ]
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-slate-500">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Built for teams shipping actual document endpoints
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <Workflow size={18} className="text-slate-950" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold text-slate-950">Define the group</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Create an API group with the document type, language cues, and exact JSON structure
                you want returned.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <ShieldCheck size={18} className="text-slate-950" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold text-slate-950">Run the test safely</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Upload a file into the in-browser test panel. Docufy processes it in memory and
                never stores the source document.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <CreditCard size={18} className="text-slate-950" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold text-slate-950">Scale with guardrails</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Billing, request history, and strict plan limits sit inside the workspace so your
                team always knows what capacity is left.
              </p>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-slate-500">Pricing</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Three USD plans and a contact lane for larger rollouts
              </h2>
            </div>

            {plansQuery.isError ? <ErrorMessage>{getErrorMessage(plansQuery.error)}</ErrorMessage> : null}

            <div className="grid gap-4 xl:grid-cols-4">
              {(plansQuery.data ?? []).map((plan) => (
                <article
                  key={plan.key}
                  className={`grid gap-5 rounded-lg border bg-stone-50 p-5 ${
                    plan.highlighted ? 'border-slate-950' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{plan.name}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{plan.description}</p>
                    </div>
                    {plan.highlighted ? <StatusBadge tone="success">Popular</StatusBadge> : null}
                  </div>
                  <div className="text-3xl font-semibold text-slate-950">
                    {formatPlanPrice(plan.price_usd, plan.interval_label)}
                  </div>
                  <ul className="grid gap-2 text-sm text-slate-600">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  {plan.contact_only ? (
                    <a
                      href={plan.cta_href ?? 'mailto:sales@docufy.ai'}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      {plan.cta_label}
                    </a>
                  ) : (
                    <a
                      href={authApi.googleLoginUrl('/billing')}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-950 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      {plan.cta_label}
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
