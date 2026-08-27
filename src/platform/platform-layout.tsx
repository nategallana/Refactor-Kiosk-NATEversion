import React, { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAdminStore } from '../admin/admin-store'
import { usePlatformStore } from './platform-store'
import { getStores, endImpersonation } from './platform-api'

export function PlatformGuard({ children }: { children: React.ReactNode }) {
  const token = useAdminStore((s) => s.token)
  const user = useAdminStore((s) => s.user)
  const navigate = useNavigate()

  useEffect(() => {
    if (!token || !user) {
      navigate('/admin/login', { replace: true })
    } else if (user.role !== 'super_admin') {
      navigate('/admin', { replace: true })
    }
  }, [token, user, navigate])

  if (!token || !user || user.role !== 'super_admin') return null
  return <>{children}</>
}

export function PlatformLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const token = useAdminStore((s) => s.token)
  const user = useAdminStore((s) => s.user)
  const signOut = useAdminStore((s) => s.signOut)

  const activeStoreId = usePlatformStore((s) => s.activeStoreId)
  const setActiveStoreId = usePlatformStore((s) => s.setActiveStoreId)
  const stores = usePlatformStore((s) => s.stores)
  const setStores = usePlatformStore((s) => s.setStores)
  const impersonation = usePlatformStore((s) => s.impersonation)
  const clearImpersonation = usePlatformStore((s) => s.clearImpersonation)

  useEffect(() => {
    if (token) {
      getStores(token)
        .then((data) => setStores(data.stores))
        .catch(() => undefined)
    }
  }, [token, setStores])

  const handleEndImpersonation = async () => {
    if (token && impersonation.sessionId) {
      try {
        await endImpersonation(token, impersonation.sessionId)
      } catch {
        // cleanup locally regardless
      }
      if (impersonation.originalToken) {
        useAdminStore.getState().setSession(impersonation.originalToken, user!)
      }
      clearImpersonation()
      navigate('/platform/security')
    }
  }

  const navItems = [
    { label: 'Overview', path: '/platform', icon: '📊' },
    { label: 'Stores', path: '/platform/stores', icon: '🏬' },
    { label: 'Users', path: '/platform/users', icon: '👥' },
    { label: 'Terminals', path: '/platform/terminals', icon: '🖥️' },
    { label: 'WBOX POS', path: '/platform/wbox', icon: '🔌' },
    { label: 'Sales Reports', path: '/platform/reports', icon: '📈' },
    { label: 'Audit Logs', path: '/platform/audit', icon: '📜' },
    { label: 'Security & Impersonation', path: '/platform/security', icon: '🛡️' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', background: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.6rem' }}>⚡</span>
            <div>
              <strong style={{ fontSize: '1.05rem', color: '#f8fafc', display: 'block' }}>Super Admin</strong>
              <small style={{ color: '#94a3b8' }}>Platform Management</small>
            </div>
          </div>
        </div>

        {/* Store Context Switcher */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e293b' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.4rem' }}>
            Store Context
          </label>
          <select
            value={activeStoreId ?? ''}
            onChange={(e) => setActiveStoreId(e.target.value ? Number(e.target.value) : null)}
            style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', fontSize: '0.85rem' }}
          >
            <option value="">All Stores (Platform)</option>
            {stores.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.code})
              </option>
            ))}
          </select>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  color: active ? '#ffffff' : '#cbd5e1',
                  background: active ? '#ea580c' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: active ? 600 : 500,
                  transition: 'background 0.15s ease',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer / Switch to Store Admin */}
        <div style={{ padding: '1.25rem', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link
            to="/admin"
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              background: '#334155',
              color: '#f8fafc',
              textDecoration: 'none',
              textAlign: 'center',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            Go to Store Admin &rarr;
          </Link>
          <button
            onClick={() => { signOut(); navigate('/admin/login') }}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              background: 'transparent',
              color: '#ef4444',
              border: '1px solid #ef444444',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Persistent Impersonation Banner */}
        {impersonation.active && (
          <div
            style={{
              background: '#b45309',
              color: '#ffffff',
              padding: '0.75rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚠️</span>
              <span>
                You are currently impersonating <strong>{impersonation.targetUserName || 'Store User'}</strong>. (Session active until {new Date(impersonation.expiresAt || '').toLocaleTimeString()})
              </span>
            </div>
            <button
              onClick={handleEndImpersonation}
              style={{
                background: '#ffffff',
                color: '#b45309',
                border: 'none',
                padding: '0.35rem 0.85rem',
                borderRadius: '4px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Exit Impersonation
            </button>
          </div>
        )}

        {/* Top Header */}
        <header style={{ height: '64px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Platform Control</span>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              {navItems.find((n) => n.path === location.pathname)?.label || 'Super Admin Platform'}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Logged in as: <strong>{user?.name}</strong> ({user?.email})
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>{children}</main>
      </div>
    </div>
  )
}
