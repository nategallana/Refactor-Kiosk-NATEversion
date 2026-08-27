import React, { useEffect, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Brand } from '../components/brand'
import { useAdminStore } from '../admin/admin-store'
import { usePlatformStore } from './platform-store'
import { getStores, endImpersonation } from './platform-api'
import { logout } from '../admin/admin-api'

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

type PlatformIconName = 'overview' | 'stores' | 'users' | 'terminals' | 'wbox' | 'reports' | 'audit' | 'security'

function PlatformNavIcon({ name }: { name: PlatformIconName }) {
  const icons: Record<PlatformIconName, ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    stores: (
      <>
        <path d="M3 9l9-6 9 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
    users: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    terminals: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </>
    ),
    wbox: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="M15 9h.01" />
        <path d="M9 15h6" />
      </>
    ),
    reports: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </>
    ),
    audit: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </>
    ),
    security: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <circle cx="12" cy="11" r="2" />
      </>
    ),
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }}
    >
      {icons[name]}
    </svg>
  )
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
        // cleanup locally
      }
      if (impersonation.originalToken && user) {
        useAdminStore.getState().signIn(impersonation.originalToken, user)
      }
      clearImpersonation()
      navigate('/platform/security')
    }
  }

  const leave = async () => {
    if (token) await logout(token).catch(() => undefined)
    signOut()
    navigate('/admin/login', { replace: true })
  }

  const navItems: Array<{ label: string; path: string; icon: PlatformIconName }> = [
    { label: 'Overview', path: '/platform', icon: 'overview' },
    { label: 'Stores', path: '/platform/stores', icon: 'stores' },
    { label: 'Users', path: '/platform/users', icon: 'users' },
    { label: 'Terminals', path: '/platform/terminals', icon: 'terminals' },
    { label: 'WBOX POS', path: '/platform/wbox', icon: 'wbox' },
    { label: 'Sales Reports', path: '/platform/reports', icon: 'reports' },
    { label: 'Audit Logs', path: '/platform/audit', icon: 'audit' },
    { label: 'Security & Access', path: '/platform/security', icon: 'security' },
  ]

  const currentNav = navItems.find((n) => n.path === location.pathname)

  return (
    <div className="admin-app">
      {/* Platform Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <Brand compact />
          <span style={{ background: '#ffedd5', color: '#c2410c', fontWeight: 800, letterSpacing: '0.08em' }}>
            SUPER ADMIN
          </span>
        </div>

        {/* Store Context Dropdown */}
        <div style={{ padding: '0.85rem 0.25rem 0.6rem', borderBottom: '1px solid var(--admin-line)' }}>
          <label style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--admin-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
            Active Store Context
          </label>
          <select
            value={activeStoreId ?? ''}
            onChange={(e) => setActiveStoreId(e.target.value ? Number(e.target.value) : null)}
            style={{
              width: '100%',
              padding: '0.45rem 0.65rem',
              borderRadius: '0.5rem',
              background: 'var(--admin-bg)',
              color: 'var(--admin-ink)',
              border: '1px solid var(--admin-line)',
              fontSize: '0.82rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">All Stores (Platform View)</option>
            {stores.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.code})
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Platform navigation" style={{ flex: 1, marginTop: '0.8rem' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/platform'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <PlatformNavIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Store Admin & Logout */}
        <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--admin-line)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link
            to="/admin"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.55rem',
              borderRadius: '0.55rem',
              background: 'var(--admin-primary-soft)',
              color: 'var(--admin-primary)',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              border: '1px solid var(--admin-primary-border)',
            }}
          >
            <span>🏪</span>
            <span>Switch to Store Admin &rarr;</span>
          </Link>
          <button className="admin-logout" onClick={leave} style={{ margin: 0 }}>
            <span aria-hidden="true">&larr;</span>
            <strong>Sign out</strong>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="admin-main">
        {/* Impersonation Banner */}
        {impersonation.active && (
          <div
            style={{
              background: '#ea580c',
              color: '#ffffff',
              padding: '0.75rem 1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 650,
              fontSize: '0.88rem',
              boxShadow: '0 2px 8px #ea580c33',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <span>
                Audited Impersonation Active: Operating as <strong>{impersonation.targetUserName || 'Store Manager'}</strong> (Session expires {new Date(impersonation.expiresAt || '').toLocaleTimeString()})
              </span>
            </div>
            <button
              onClick={handleEndImpersonation}
              style={{
                background: '#ffffff',
                color: '#c2410c',
                border: 'none',
                padding: '0.35rem 0.9rem',
                borderRadius: '0.4rem',
                fontWeight: 750,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Exit Impersonation
            </button>
          </div>
        )}

        {/* Top Header */}
        <header className="admin-header">
          <div className="admin-header__title">
            <p>PLATFORM CONTROL</p>
            <h1>{currentNav?.label || 'Super Admin Platform'}</h1>
          </div>
          <div className="admin-header__tools">
            <div className="admin-user">
              <span>{user?.name.slice(0, 1) ?? 'S'}</span>
              <div>
                <strong>{user?.name ?? 'Super Administrator'}</strong>
                <small>{user?.role ?? 'super_admin'}</small>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="admin-content">{children}</div>
      </main>
    </div>
  )
}
