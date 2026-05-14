import { DatabaseZap, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/client'
import { Button } from '../components/ui'

export function Register() {
  function continueWithGoogle() {
    window.location.assign(authApi.googleLoginUrl('/dashboard'))
  }

  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white">
            <DatabaseZap size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-950">Create your Docufy account</h1>
            <p className="mt-1 text-sm text-slate-500">
              Sign up securely with Google. No Docufy password required.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <Button className="w-full" onClick={continueWithGoogle}>
            <span className="grid size-5 place-items-center rounded-full bg-white text-sm font-semibold text-slate-950">
              G
            </span>
            Continue with Google
          </Button>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <UserPlus className="mb-2 size-4 text-slate-700" aria-hidden="true" />
            If your Google email is new to Docufy, an account is created automatically.
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          <Link className="font-medium text-slate-700 underline-offset-4 hover:underline" to="/">
            Back to home
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          Already have access?{' '}
          <Link className="font-medium text-slate-950 underline-offset-4 hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  )
}
