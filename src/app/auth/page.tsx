'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getClient } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = getClient()

    try {
      if (isSignUp) {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase(),
          })
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
      }
      router.replace('/home')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent-teal/10 flex items-center justify-center">
            <span className="text-2xl">🌙</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-100 mb-2">
          {isSignUp ? 'Create account' : 'Welcome back'}
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          {isSignUp
            ? 'Sign up to track and share your sleep.'
            : 'Sign in to continue your sleep journey.'}
        </p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-bg-tertiary text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-accent-teal/50"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full bg-bg-tertiary text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-accent-teal/50"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-teal text-bg-primary font-semibold rounded-xl py-3.5 text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
              : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
          className="w-full text-center text-accent-teal text-sm mt-5"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  )
}
