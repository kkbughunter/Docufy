import { Home, SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-lg bg-slate-950 text-white">
          <SearchX size={24} aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-slate-950">Page not found</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          The page may have moved or the URL is incorrect.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-950 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Home size={16} aria-hidden="true" />
          Go to Dashboard
        </Link>
      </section>
    </main>
  )
}
