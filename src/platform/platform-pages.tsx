import React, { useCallback, useEffect, useState } from 'react'
import { useAdminStore } from '../admin/admin-store'
import { usePlatformStore } from './platform-store'
import { formatPhTime, formatPhDateTime } from '../domain/datetime'
import {
  getStores,
  createStore,
  updateStore,
  getUsers,
  updateUser,
  getPlatformTerminals,
  getSalesReport,
  getAuditLogs,
  startImpersonation,
  type PlatformStore,
  type PlatformUser,
  type PlatformTerminal,
  type SalesSummary,
  type StoreSales,
  type AuditLogItem,
} from './platform-api'
import { getWboxStatus } from '../admin/admin-api'
import { formatMoney } from '../domain/order'

interface WboxConnectionStatus {
  credentials_configured: boolean
  request_path?: { path: string | null; exists: boolean; writable: boolean }
  response_path?: { path: string | null; exists: boolean; readable: boolean }
}

/* -------------------------------------------------------------
 * 1. OVERVIEW PAGE
 * ------------------------------------------------------------- */
export function OverviewPage() {
  const token = useAdminStore((s) => s.token)
  const [stores, setStores] = useState<PlatformStore[]>([])
  const [terminals, setTerminals] = useState<PlatformTerminal[]>([])
  const [sales, setSales] = useState<SalesSummary | null>(null)
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([])
  const [wboxStatus, setWboxStatus] = useState<WboxConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    Promise.all([
      getStores(token).then((r) => setStores(r.stores)),
      getPlatformTerminals(token).then((r) => setTerminals(r.terminals)),
      getSalesReport(token).then((r) => setSales(r.summary)),
      getAuditLogs(token, undefined, 1).then((r) => setRecentLogs(r.data.slice(0, 6))),
      getWboxStatus(token).then((r) => setWboxStatus(r.connection)).catch(() => null),
    ]).finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-muted)', fontWeight: 600 }}>
        Loading platform overview…
      </div>
    )
  }

  const onlineTerminals = terminals.filter((t) => t.is_online).length
  const activeStores = stores.filter((s) => s.active).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.2rem' }}>
        <div style={{ background: '#fff', padding: '1.3rem', borderRadius: '0.85rem', border: '1px solid var(--admin-line)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-muted)' }}>
            Active Store Branches
          </span>
          <h3 style={{ fontSize: '1.85rem', margin: '0.4rem 0', fontWeight: 800, color: 'var(--admin-ink)' }}>
            {activeStores} <span style={{ fontSize: '1.1rem', color: 'var(--admin-muted)', fontWeight: 500 }}>/ {stores.length}</span>
          </h3>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '0.2rem 0.55rem', borderRadius: '999px' }}>
            ● Multi-Tenant Isolated
          </span>
        </div>

        <div style={{ background: '#fff', padding: '1.3rem', borderRadius: '0.85rem', border: '1px solid var(--admin-line)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-muted)' }}>
            Online Terminals Fleet
          </span>
          <h3 style={{ fontSize: '1.85rem', margin: '0.4rem 0', fontWeight: 800, color: 'var(--admin-ink)' }}>
            {onlineTerminals} <span style={{ fontSize: '1.1rem', color: 'var(--admin-muted)', fontWeight: 500 }}>/ {terminals.length}</span>
          </h3>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: onlineTerminals > 0 ? '#16a34a' : '#ea580c', background: onlineTerminals > 0 ? '#dcfce7' : '#ffedd5', padding: '0.2rem 0.55rem', borderRadius: '999px' }}>
            ● Live Hardware Heartbeats
          </span>
        </div>

        <div style={{ background: '#fff', padding: '1.3rem', borderRadius: '0.85rem', border: '1px solid var(--admin-line)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-muted)' }}>
            Gross Platform Sales
          </span>
          <h3 style={{ fontSize: '1.85rem', margin: '0.4rem 0', fontWeight: 800, color: 'var(--admin-primary)' }}>
            {formatMoney(sales?.sales_minor || 0)}
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--admin-muted)', fontWeight: 600 }}>
            {sales?.orders_count || 0} completed orders
          </span>
        </div>

        <div style={{ background: '#fff', padding: '1.3rem', borderRadius: '0.85rem', border: '1px solid var(--admin-line)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-muted)' }}>
            WBOX POS Connector
          </span>
          <h3 style={{ fontSize: '1.35rem', margin: '0.65rem 0', fontWeight: 800, color: wboxStatus?.credentials_configured ? '#16a34a' : '#ea580c' }}>
            {wboxStatus?.credentials_configured ? 'Active & Ready' : 'Pending Configuration'}
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--admin-muted)', fontWeight: 600 }}>
            Local File System Bridge
          </span>
        </div>
      </div>

      {/* Recent Security & Platform Events */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.85rem', border: '1px solid var(--admin-line)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 750, color: 'var(--admin-ink)' }}>Recent Platform Activity</h3>
            <small style={{ color: 'var(--admin-muted)' }}>Immutable system and audit events</small>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--admin-line)', color: 'var(--admin-muted)' }}>
                <th style={{ padding: '0.65rem', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Action Event</th>
                <th style={{ padding: '0.65rem', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Actor</th>
                <th style={{ padding: '0.65rem', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Entity</th>
                <th style={{ padding: '0.65rem', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f7f4f0' }}>
                  <td style={{ padding: '0.75rem 0.65rem', fontWeight: 700 }}>
                    <code style={{ background: '#f5f3f0', padding: '0.2rem 0.45rem', borderRadius: '4px', color: '#c2410c' }}>
                      {log.action}
                    </code>
                  </td>
                  <td style={{ padding: '0.75rem 0.65rem', color: 'var(--admin-ink)', fontWeight: 600 }}>
                    {log.actor_name || 'System Auto'}
                  </td>
                  <td style={{ padding: '0.75rem 0.65rem', color: 'var(--admin-muted)' }}>
                    {log.entity_type} #{log.entity_id}
                  </td>
                  <td style={{ padding: '0.75rem 0.65rem', color: 'var(--admin-muted)' }}>
                    {formatPhDateTime(log.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------
 * 2. STORES PAGE
 * ------------------------------------------------------------- */
export function StoresPage() {
  const token = useAdminStore((s) => s.token)
  const [stores, setStores] = useState<PlatformStore[]>([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [timezone, setTimezone] = useState('Asia/Manila')
  const [submitting, setSubmitting] = useState(false)

  const reload = useCallback(() => {
    if (!token) return
    getStores(token)
      .then((r) => setStores(r.stores))
      .catch(() => undefined)
  }, [token])

  useEffect(() => {
    reload()
  }, [reload])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !name || !code) return
    setSubmitting(true)
    try {
      await createStore(token, { name, code, timezone })
      setName('')
      setCode('')
      reload()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (store: PlatformStore) => {
    if (!token) return
    await updateStore(token, store.id, { active: !store.active })
    reload()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Create Store Form */}
      <form onSubmit={handleCreate} style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.85rem', border: '1px solid var(--admin-line)' }}>
        <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1.1rem', fontWeight: 750 }}>Provision New Store Branch</h3>
        <p style={{ color: 'var(--admin-muted)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
          Create an isolated store workspace with its own catalog, terminals, orders, and WBOX configuration.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Store Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Northpoint Branch"
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--admin-line)', fontSize: '0.88rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Store Code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="e.g. NORTH"
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--admin-line)', fontSize: '0.88rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Timezone
            </label>
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--admin-line)', fontSize: '0.88rem' }}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '0.62rem 1.4rem',
              background: 'var(--admin-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            {submitting ? 'Creating…' : '+ Add Store'}
          </button>
        </div>
      </form>

      {/* Stores List */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.85rem', border: '1px solid var(--admin-line)' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 750 }}>Managed Stores ({stores.length})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--admin-line)', color: 'var(--admin-muted)' }}>
              <th style={{ padding: '0.65rem' }}>ID</th>
              <th style={{ padding: '0.65rem' }}>Store Name</th>
              <th style={{ padding: '0.65rem' }}>Code</th>
              <th style={{ padding: '0.65rem' }}>Timezone</th>
              <th style={{ padding: '0.65rem' }}>Status</th>
              <th style={{ padding: '0.65rem' }}>Controls</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((st) => (
              <tr key={st.id} style={{ borderBottom: '1px solid #f7f4f0' }}>
                <td style={{ padding: '0.75rem 0.65rem', fontWeight: 700, color: 'var(--admin-muted)' }}>#{st.id}</td>
                <td style={{ padding: '0.75rem 0.65rem', fontWeight: 750 }}>{st.name}</td>
                <td style={{ padding: '0.75rem 0.65rem' }}>
                  <code style={{ background: '#f5f3f0', padding: '0.2rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                    {st.code}
                  </code>
                </td>
                <td style={{ padding: '0.75rem 0.65rem', color: 'var(--admin-muted)' }}>{st.timezone}</td>
                <td style={{ padding: '0.75rem 0.65rem' }}>
                  <span style={{ padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, background: st.active ? '#dcfce7' : '#fee2e2', color: st.active ? '#16a34a' : '#ef4444' }}>
                    {st.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 0.65rem' }}>
                  <button
                    onClick={() => toggleActive(st)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 650,
                      borderRadius: '0.4rem',
                      border: '1px solid var(--admin-line)',
                      background: 'var(--admin-bg)',
                      cursor: 'pointer',
                    }}
                  >
                    {st.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------
 * 3. USERS PAGE
 * ------------------------------------------------------------- */
export function UsersPage() {
  const token = useAdminStore((s) => s.token)
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [stores, setStores] = useState<PlatformStore[]>([])

  const reload = useCallback(() => {
    if (!token) return
    Promise.all([
      getUsers(token).then((r) => setUsers(r.users)),
      getStores(token).then((r) => setStores(r.stores)),
    ])
  }, [token])

  useEffect(() => {
    reload()
  }, [reload])

  const handleRoleChange = async (userId: number, role: string) => {
    if (!token) return
    await updateUser(token, userId, { role })
    reload()
  }

  const handleStoreChange = async (userId: number, storeIdStr: string) => {
    if (!token) return
    const store_id = storeIdStr ? Number(storeIdStr) : null
    await updateUser(token, userId, { store_id })
    reload()
  }

  return (
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.85rem', border: '1px solid var(--admin-line)' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 750 }}>Platform Accounts ({users.length})</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--admin-line)', color: 'var(--admin-muted)' }}>
            <th style={{ padding: '0.65rem' }}>Name</th>
            <th style={{ padding: '0.65rem' }}>Email Address</th>
            <th style={{ padding: '0.65rem' }}>Platform Role</th>
            <th style={{ padding: '0.65rem' }}>Assigned Store</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: '1px solid #f7f4f0' }}>
              <td style={{ padding: '0.75rem 0.65rem', fontWeight: 750 }}>{u.name}</td>
              <td style={{ padding: '0.75rem 0.65rem', color: 'var(--admin-muted)' }}>{u.email}</td>
              <td style={{ padding: '0.75rem 0.65rem' }}>
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  style={{ padding: '0.35rem 0.6rem', borderRadius: '0.4rem', border: '1px solid var(--admin-line)', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  <option value="store_admin">Store Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </td>
              <td style={{ padding: '0.75rem 0.65rem' }}>
                <select
                  value={u.store_id ?? ''}
                  onChange={(e) => handleStoreChange(u.id, e.target.value)}
                  style={{ padding: '0.35rem 0.6rem', borderRadius: '0.4rem', border: '1px solid var(--admin-line)', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  <option value="">(Platform-wide / Unassigned)</option>
                  {stores.map((st) => (
                    <option key={st.id} value={st.id}>{st.name} ({st.code})</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* -------------------------------------------------------------
 * 4. TERMINALS MONITORING PAGE
 * ------------------------------------------------------------- */
export function TerminalsPage() {
  const token = useAdminStore((s) => s.token)
  const [terminals, setTerminals] = useState<PlatformTerminal[]>([])

  useEffect(() => {
    if (!token) return
    getPlatformTerminals(token).then((r) => setTerminals(r.terminals))
  }, [token])

  return (
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.85rem', border: '1px solid var(--admin-line)' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 750 }}>Hardware Fleet Telemetry</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--admin-line)', color: 'var(--admin-muted)' }}>
            <th style={{ padding: '0.65rem' }}>Terminal ID</th>
            <th style={{ padding: '0.65rem' }}>Terminal Name</th>
            <th style={{ padding: '0.65rem' }}>Store Location</th>
            <th style={{ padding: '0.65rem' }}>WBOX Kiosk #</th>
            <th style={{ padding: '0.65rem' }}>Status</th>
            <th style={{ padding: '0.65rem' }}>Last Heartbeat</th>
          </tr>
        </thead>
        <tbody>
          {terminals.map((t) => (
            <tr key={t.id} style={{ borderBottom: '1px solid #f7f4f0' }}>
              <td style={{ padding: '0.75rem 0.65rem', fontWeight: 750 }}>
                <code style={{ background: '#f5f3f0', padding: '0.2rem 0.45rem', borderRadius: '4px' }}>{t.id}</code>
              </td>
              <td style={{ padding: '0.75rem 0.65rem' }}>{t.name}</td>
              <td style={{ padding: '0.75rem 0.65rem', color: 'var(--admin-muted)', fontWeight: 600 }}>{t.store_name || `Store #${t.store_id}`}</td>
              <td style={{ padding: '0.75rem 0.65rem' }}>
                <code style={{ color: '#c2410c', fontWeight: 700 }}>{t.wbox_kiosk_number}</code>
              </td>
              <td style={{ padding: '0.75rem 0.65rem' }}>
                <span style={{ padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, background: t.is_online ? '#dcfce7' : '#fee2e2', color: t.is_online ? '#16a34a' : '#ef4444' }}>
                  {t.is_online ? 'ONLINE' : 'OFFLINE'}
                </span>
              </td>
              <td style={{ padding: '0.75rem 0.65rem', color: 'var(--admin-muted)' }}>
                {t.last_heartbeat_at ? formatPhTime(t.last_heartbeat_at) : 'Never'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* -------------------------------------------------------------
 * 5. WBOX POS PAGE
 * ------------------------------------------------------------- */
export function WboxPage() {
  const token = useAdminStore((s) => s.token)
  const [wbox, setWbox] = useState<WboxConnectionStatus | null>(null)

  useEffect(() => {
    if (!token) return
    getWboxStatus(token).then((r) => setWbox(r.connection)).catch(() => null)
  }, [token])

  return (
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.85rem', border: '1px solid var(--admin-line)' }}>
      <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1.1rem', fontWeight: 750 }}>WBOX POS Bridge Connector</h3>
      <p style={{ color: 'var(--admin-muted)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
        Verifies the active file handshake directory between the kiosk service and the local Windows POS terminal.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        <div style={{ padding: '1.2rem', background: 'var(--admin-bg)', borderRadius: '0.75rem', border: '1px solid var(--admin-line)' }}>
          <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Request Directory:</strong>
          <code style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{wbox?.request_path?.path || 'Not configured'}</code>
          <div style={{ marginTop: '0.75rem', color: wbox?.request_path?.writable ? '#16a34a' : '#dc2626', fontSize: '0.82rem', fontWeight: 750 }}>
            {wbox?.request_path?.writable ? '✓ Writable & Ready' : '✕ Path Not Accessible'}
          </div>
        </div>

        <div style={{ padding: '1.2rem', background: 'var(--admin-bg)', borderRadius: '0.75rem', border: '1px solid var(--admin-line)' }}>
          <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Response Directory:</strong>
          <code style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{wbox?.response_path?.path || 'Not configured'}</code>
          <div style={{ marginTop: '0.75rem', color: wbox?.response_path?.readable ? '#16a34a' : '#dc2626', fontSize: '0.82rem', fontWeight: 750 }}>
            {wbox?.response_path?.readable ? '✓ Readable & Ready' : '✕ Path Not Accessible'}
          </div>
        </div>

        <div style={{ padding: '1.2rem', background: 'var(--admin-bg)', borderRadius: '0.75rem', border: '1px solid var(--admin-line)' }}>
          <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Encrypted Credentials:</strong>
          <div style={{ marginTop: '0.75rem', color: wbox?.credentials_configured ? '#16a34a' : '#dc2626', fontSize: '0.82rem', fontWeight: 750 }}>
            {wbox?.credentials_configured ? '✓ Stored Encrypted (AES-256)' : '✕ Missing Auth Secret'}
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------
 * 6. SALES REPORTS PAGE
 * ------------------------------------------------------------- */
export function ReportsPage() {
  const token = useAdminStore((s) => s.token)
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [byStore, setByStore] = useState<StoreSales[]>([])

  useEffect(() => {
    if (!token) return
    getSalesReport(token).then((r) => {
      setSummary(r.summary)
      setByStore(r.by_store)
    })
  }, [token])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.2rem' }}>
        <div style={{ background: '#fff', padding: '1.3rem', borderRadius: '0.85rem', border: '1px solid var(--admin-line)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-muted)' }}>Platform Gross Revenue</span>
          <h3 style={{ fontSize: '1.85rem', margin: '0.4rem 0', fontWeight: 800, color: 'var(--admin-primary)' }}>{formatMoney(summary?.sales_minor || 0)}</h3>
        </div>
        <div style={{ background: '#fff', padding: '1.3rem', borderRadius: '0.85rem', border: '1px solid var(--admin-line)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-muted)' }}>Total Paid Orders</span>
          <h3 style={{ fontSize: '1.85rem', margin: '0.4rem 0', fontWeight: 800, color: 'var(--admin-ink)' }}>{summary?.orders_count || 0}</h3>
        </div>
      </div>

      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.85rem', border: '1px solid var(--admin-line)' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 750 }}>Revenue Breakdown by Store Branch</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--admin-line)', color: 'var(--admin-muted)' }}>
              <th style={{ padding: '0.65rem' }}>Store Name</th>
              <th style={{ padding: '0.65rem' }}>Completed Orders</th>
              <th style={{ padding: '0.65rem' }}>Total Sales</th>
            </tr>
          </thead>
          <tbody>
            {byStore.map((st) => (
              <tr key={st.id} style={{ borderBottom: '1px solid #f7f4f0' }}>
                <td style={{ padding: '0.75rem 0.65rem', fontWeight: 750 }}>{st.name}</td>
                <td style={{ padding: '0.75rem 0.65rem', color: 'var(--admin-muted)' }}>{st.orders_count}</td>
                <td style={{ padding: '0.75rem 0.65rem', fontWeight: 800, color: 'var(--admin-primary)' }}>{formatMoney(st.sales_minor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------
 * 7. AUDIT LOGS PAGE
 * ------------------------------------------------------------- */
export function AuditLogPage() {
  const token = useAdminStore((s) => s.token)
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [actionFilter, setActionFilter] = useState('')

  useEffect(() => {
    if (!token) return
    getAuditLogs(token, actionFilter || undefined).then((r) => setLogs(r.data))
  }, [token, actionFilter])

  return (
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.85rem', border: '1px solid var(--admin-line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 750 }}>Immutable Audit Logs</h3>
          <small style={{ color: 'var(--admin-muted)' }}>Cryptographically stamped audit records</small>
        </div>
        <input
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="Filter by action (e.g. settings.updated)…"
          style={{ padding: '0.5rem 0.8rem', borderRadius: '0.5rem', border: '1px solid var(--admin-line)', fontSize: '0.85rem', width: '300px' }}
        />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--admin-line)', color: 'var(--admin-muted)' }}>
            <th style={{ padding: '0.65rem' }}>Action</th>
            <th style={{ padding: '0.65rem' }}>Actor</th>
            <th style={{ padding: '0.65rem' }}>Entity</th>
            <th style={{ padding: '0.65rem' }}>Audit Snapshot</th>
            <th style={{ padding: '0.65rem' }}>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} style={{ borderBottom: '1px solid #f7f4f0' }}>
              <td style={{ padding: '0.75rem 0.65rem', fontWeight: 750 }}>
                <code style={{ background: '#f5f3f0', padding: '0.2rem 0.45rem', borderRadius: '4px', color: '#c2410c' }}>
                  {log.action}
                </code>
              </td>
              <td style={{ padding: '0.75rem 0.65rem', fontWeight: 600 }}>{log.actor_name || 'System Auto'}</td>
              <td style={{ padding: '0.75rem 0.65rem', color: 'var(--admin-muted)' }}>{log.entity_type} #{log.entity_id}</td>
              <td style={{ padding: '0.75rem 0.65rem', fontSize: '0.78rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {log.after || log.before || '—'}
              </td>
              <td style={{ padding: '0.75rem 0.65rem', color: 'var(--admin-muted)' }}>{formatPhDateTime(log.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* -------------------------------------------------------------
 * 8. SECURITY & IMPERSONATION PAGE
 * ------------------------------------------------------------- */
export function SecurityPage() {
  const token = useAdminStore((s) => s.token)
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [stores, setStores] = useState<PlatformStore[]>([])
  const [targetUserId, setTargetUserId] = useState<number | ''>('')
  const [targetStoreId, setTargetStoreId] = useState<number | ''>('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const setImpersonation = usePlatformStore((s) => s.setImpersonation)

  useEffect(() => {
    if (!token) return
    Promise.all([
      getUsers(token).then((r) => setUsers(r.users.filter((u) => u.role !== 'super_admin'))),
      getStores(token).then((r) => setStores(r.stores)),
    ])
  }, [token])

  const handleImpersonate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !targetUserId || !targetStoreId || !reason) return
    setSubmitting(true)
    try {
      const res = await startImpersonation(token, Number(targetUserId), Number(targetStoreId), reason)
      setImpersonation({
        sessionId: res.session_id,
        targetUserName: res.user.name,
        targetStoreId: Number(targetStoreId),
        expiresAt: res.expires_at,
        originalToken: token,
      })
      useAdminStore.getState().signIn(res.token, res.user)
      alert(`Impersonation session active for ${res.user.name}.`)
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleImpersonate} style={{ background: '#fff', padding: '1.75rem', borderRadius: '0.85rem', border: '1px solid var(--admin-line)', maxWidth: '640px' }}>
      <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1.15rem', fontWeight: 750 }}>Audited Impersonation Mode</h3>
      <p style={{ color: 'var(--admin-muted)', fontSize: '0.84rem', marginBottom: '1.5rem' }}>
        Assume temporary Store Manager privileges to troubleshoot catalog, live orders, or hardware issues. All operations are logged. Sessions expire after 30 minutes.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: '0.35rem' }}>
            Target Store User
          </label>
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(Number(e.target.value))}
            required
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--admin-line)', fontSize: '0.88rem', fontWeight: 600 }}
          >
            <option value="">Select target store manager…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email}) — Store #{u.store_id || 'n/a'}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: '0.35rem' }}>
            Target Store Context
          </label>
          <select
            value={targetStoreId}
            onChange={(e) => setTargetStoreId(Number(e.target.value))}
            required
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--admin-line)', fontSize: '0.88rem', fontWeight: 600 }}
          >
            <option value="">Select store branch…</option>
            {stores.map((st) => (
              <option key={st.id} value={st.id}>{st.name} ({st.code})</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-muted)', marginBottom: '0.35rem' }}>
            Mandatory Audit Justification
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minLength={5}
            placeholder="e.g. Assisting store with menu prices sync"
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--admin-line)', fontSize: '0.88rem' }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: '0.5rem',
            padding: '0.7rem 1.6rem',
            background: 'var(--admin-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.55rem',
            fontWeight: 750,
            fontSize: '0.88rem',
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {submitting ? 'Starting Session…' : 'Start Audited Impersonation'}
        </button>
      </div>
    </form>
  )
}
