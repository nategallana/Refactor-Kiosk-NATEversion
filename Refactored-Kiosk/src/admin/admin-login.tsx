import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Brand } from '../components/brand'
import { login } from './admin-api'
import { useAdminStore } from './admin-store'

export function AdminLogin() {
  const navigate = useNavigate()
  const token = useAdminStore((state) => state.token)
  const signIn = useAdminStore((state) => state.signIn)
  const [email, setEmail] = useState('admin@kiosk.local')
  const [password, setPassword] = useState('Admin123!')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (token) return <Navigate to="/admin" replace />
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try { const result = await login(email, password); signIn(result.token, result.user); navigate('/admin', { replace: true }) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to sign in.') }
    finally { setBusy(false) }
  }
  return <main className="admin-login"><section className="admin-login__story"><Brand /><div><p>OPERATIONS, IN ONE PLACE</p><h1>Run every shift<br /><em>with confidence.</em></h1><span>Catalog, orders, kiosks, and reports—kept clear and close at hand.</span></div></section><section className="admin-login__form"><form onSubmit={submit}><p>ADMIN PORTAL</p><h2>Welcome back</h2><span>Sign in to manage your kiosk operation.</span><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>{error && <div className="admin-error" role="alert">{error}</div>}<button className="admin-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <b>→</b></button><small>Development credentials are prefilled. Change them before deployment.</small></form></section></main>
}
