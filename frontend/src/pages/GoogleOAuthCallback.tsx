import { Loader2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorMessage } from '../components/ui'
import { useAuthStore } from '../store/authStore'

export function GoogleOAuthCallback() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const parsed = useMemo(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash
    return new URLSearchParams(hash)
  }, [])

  const accessToken = parsed.get('access_token')
  const refreshToken = parsed.get('refresh_token')
  const email = parsed.get('email')
  const fullName = parsed.get('full_name') || undefined
  const avatarUrl = parsed.get('avatar_url') || undefined
  const nextPath = parsed.get('next') || '/dashboard'

  useEffect(() => {
    if (!accessToken || !refreshToken || !email) {
      return
    }

    setAuth({
      accessToken,
      refreshToken,
      user: {
        email,
        fullName,
        avatarUrl,
      },
    })

    navigate(nextPath.startsWith('/') ? nextPath : '/dashboard', { replace: true })
  }, [accessToken, avatarUrl, email, fullName, navigate, nextPath, refreshToken, setAuth])

  if (!accessToken || !refreshToken || !email) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-50 px-4 py-10">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <ErrorMessage>Google sign-in did not return a valid Docufy session.</ErrorMessage>
          <Link
            to="/login"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-lg border border-slate-950 bg-slate-950 px-4 text-sm font-medium text-white"
          >
            Back to Sign In
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-4 py-10">
      <section className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Completing Google sign-in...
      </section>
    </main>
  )
}
