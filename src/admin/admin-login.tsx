import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Brand } from '../components/brand'
import { login, RateLimitError } from './admin-api'
import { useAdminStore } from './admin-store'

export function AdminLogin() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const user = useAdminStore((state) => state.user)
  const token = useAdminStore((state) => state.token)
  const signIn = useAdminStore((state) => state.signIn)
  const [email, setEmail] = useState('superadmin@kiosk.local')
  const [password, setPassword] = useState('Admin123!')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(() => params.get('expired') ? 'Your session expired. Please sign in again.' : '')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  if (token) return <Navigate to={user?.role === 'super_admin' ? '/platform' : '/admin'} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || cooldown > 0) return
    setBusy(true)
    setError('')
    try {
      const result = await login(email, password)
      signIn(result.token, result.user)
      const targetPath = result.user.role === 'super_admin' ? '/platform' : '/admin'
      navigate(targetPath, { replace: true })
    } catch (reason) {
      if (reason instanceof RateLimitError) setCooldown(reason.retryAfterSeconds)
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="admin-login">
    <section className="admin-login__story">
      <Brand />
      <div>
        <p>OPERATIONS, IN ONE PLACE</p>
        <h1>Run every shift<br /><em>with confidence.</em></h1>
        <span>Catalog, orders, kiosks, and reports—kept clear and close at hand.</span>
      </div>
    </section>
    <section className="admin-login__form">
      <form onSubmit={submit}>
        <p>ADMIN PORTAL</p>
        <h2>Welcome back</h2>
        <span>Sign in to manage your kiosk operation.</span>
        <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" /></label>
        <label>Password<div className="admin-password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
        {error && <div className="admin-error" role="alert">{error}</div>}
        <button className="admin-primary" disabled={busy || cooldown > 0}>{busy ? 'Signing in...' : cooldown > 0 ? 'Try again in ' + cooldown + 's' : 'Sign in'} <b>&rarr;</b></button>
        <small>Development credentials are prefilled. Change them before deployment.</small>
      </form>
    </section>
  </main>
}
