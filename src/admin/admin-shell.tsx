import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Brand } from '../components/brand'
import { logout } from './admin-api'
import { useAdminStore } from './admin-store'

type NavIconName = 'dashboard' | 'catalog' | 'orders' | 'kiosks' | 'reports' | 'settings'

const links: Array<{ label: string; href: string; icon: NavIconName }> = [
  { label: 'Dashboard', href: '/admin', icon: 'dashboard' },
  { label: 'Catalog', href: '/admin/catalog', icon: 'catalog' },
  { label: 'Orders', href: '/admin/orders', icon: 'orders' },
  { label: 'Kiosks', href: '/admin/kiosks', icon: 'kiosks' },
  { label: 'Reports', href: '/admin/reports', icon: 'reports' },
  { label: 'Settings', href: '/admin/settings', icon: 'settings' },
]

function NavIcon({ name }: { name: NavIconName }) {
  const paths: Record<NavIconName, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    catalog: <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
    orders: <><path d="M6 3h12v18H6z" /><path d="M9 7h6M9 11h6M9 15h4" /></>,
    kiosks: <><rect x="4" y="3" width="16" height="13" rx="2" /><path d="M8 21h8M12 16v5" /></>,
    reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.37.36.7.66.96.3.26.68.4 1.08.4H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z" /></>,
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

export function AdminShell({ title, eyebrow, children, action }: { title: string; eyebrow: string; children: ReactNode; action?: ReactNode }) {
  const navigate = useNavigate()
  const token = useAdminStore((state) => state.token)
  const user = useAdminStore((state) => state.user)
  const signOut = useAdminStore((state) => state.signOut)

  const leave = async () => {
    if (token) await logout(token).catch(() => undefined)
    signOut()
    navigate('/admin/login', { replace: true })
  }

  return <div className="admin-app">
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand"><Brand compact /><span>ADMIN</span></div>
      <nav aria-label="Admin navigation">
        {links.map(({ label, href, icon }) => <NavLink key={href} to={href} end={href === '/admin'}>
          <NavIcon name={icon} /><span>{label}</span>
        </NavLink>)}
      </nav>
      <button className="admin-logout" onClick={leave}>
        <span aria-hidden="true">&larr;</span><strong>Logout</strong>
      </button>
    </aside>

    <main className="admin-main">
      <header className="admin-header">
        <div className="admin-header__title"><p>{eyebrow}</p><h1>{title}</h1></div>
        <div className="admin-header__tools">
          {action}
          <button className="admin-notification" aria-label="Notifications"><span /></button>
          <div className="admin-user">
            <span>{user?.name.slice(0, 1) ?? 'A'}</span>
            <div><strong>{user?.name ?? 'Administrator'}</strong><small>{user?.role ?? 'admin'}</small></div>
          </div>
        </div>
      </header>
      <div className="admin-content">{children}</div>
    </main>
  </div>
}
