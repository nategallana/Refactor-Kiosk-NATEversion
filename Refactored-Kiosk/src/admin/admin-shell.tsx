import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Brand } from '../components/brand'
import { logout } from './admin-api'
import { useAdminStore } from './admin-store'

const links = [
  ['Dashboard', '/admin'], ['Catalog', '/admin/catalog'], ['Orders', '/admin/orders'],
  ['Kiosks', '/admin/kiosks'], ['Reports', '/admin/reports'], ['Settings', '/admin/settings'],
] as const

export function AdminShell({ title, eyebrow, children, action }: { title: string; eyebrow: string; children: ReactNode; action?: ReactNode }) {
  const navigate = useNavigate()
  const token = useAdminStore((state) => state.token)
  const user = useAdminStore((state) => state.user)
  const signOut = useAdminStore((state) => state.signOut)
  const leave = async () => {
    if (token) await logout(token).catch(() => undefined)
    signOut(); navigate('/admin/login', { replace: true })
  }
  return <div className="admin-app">
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand"><Brand compact /><span>ADMIN</span></div>
      <nav>{links.map(([label, href]) => <NavLink key={href} to={href} end={href === '/admin'}>{label}</NavLink>)}</nav>
      <div className="admin-profile"><span>{user?.name.slice(0, 1) ?? 'A'}</span><div><strong>{user?.name}</strong><small>{user?.role}</small></div><button onClick={leave} aria-label="Sign out">↗</button></div>
    </aside>
    <main className="admin-main"><header className="admin-header"><div><p>{eyebrow}</p><h1>{title}</h1></div>{action}</header>{children}</main>
  </div>
}
