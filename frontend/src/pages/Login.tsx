import { DatabaseZap, ShieldCheck } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { authApi } from '../api/client'
import { Button, ErrorMessage } from '../components/ui'

export function Login() {
  const location = useLocation()
  const oauthError = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('oauth_error')
  }, [location.search])

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
            <h1 className="text-xl font-semibold text-slate-950">Sign in to Docufy</h1>
            <p className="mt-1 text-sm text-slate-500">
              Use your Google account to access extraction APIs.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {oauthError ? <ErrorMessage>{oauthError}</ErrorMessage> : null}

          <Button className="w-full" onClick={continueWithGoogle}>
            <span className="grid size-5 place-items-center rounded-full bg-white text-sm font-semibold text-slate-950">
              G
            </span>
            Continue with Google
          </Button>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-start gap-2 text-xs leading-5 text-slate-600">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
              Docufy only requests basic Google identity scopes: openid, email, and profile.
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          New here?{' '}
          <Link className="font-medium text-slate-950 underline-offset-4 hover:underline" to="/register">
            Continue with Google to create an account
          </Link>
        </p>
      </section>
    </main>
  )
}
