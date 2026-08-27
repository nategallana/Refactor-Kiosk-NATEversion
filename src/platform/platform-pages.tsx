import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAdminStore } from '../admin/admin-store'
import { usePlatformStore } from './platform-store'
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

/* -------------------------------------------------------------
 * 1. OVERVIEW PAGE
 * ------------------------------------------------------------- */
export function OverviewPage() {
  const token = useAdminStore((s) => s.token)
  const [stores, setStores] = useState<PlatformStore[]>([])
  const [terminals, setTerminals] = useState<PlatformTerminal[]>([])
  const [sales, setSales] = useState<SalesSummary | null>(null)
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([])
  const [wboxStatus, setWboxStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    Promise.all([
      getStores(token).then((r) => setStores(r.stores)),
      getPlatformTerminals(token).then((r) => setTerminals(r.terminals)),
      getSalesReport(token).then((r) => setSales(r.summary)),
      getAuditLogs(token, undefined, 1).then((r) => setRecentLogs(r.data.slice(0, 5))),
      getWboxStatus(token).then((r) => setWboxStatus(r.connection)).catch(() => null),
    ]).finally(() => setLoading(false))
  }, [token])

  if (loading) return <div>Loading platform overview…</div>

  const onlineTerminals = terminals.filter((t) => t.is_online).length
  const activeStores = stores.filter((s) => s.active).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Active Stores</span>
          <h3 style={{ fontSize: '1.75rem', margin: '0.4rem 0', color: '#0f172a' }}>{activeStores} / {stores.length}</h3>
          <small style={{ color: '#16a34a' }}>● Multi-tenant enabled</small>
        </div>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Online Terminals</span>
          <h3 style={{ fontSize: '1.75rem', margin: '0.4rem 0', color: '#0f172a' }}>{onlineTerminals} / {terminals.length}</h3>
          <small style={{ color: onlineTerminals > 0 ? '#16a34a' : '#ea580c' }}>● Real-time telemetry</small>
        </div>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Platform Sales</span>
          <h3 style={{ fontSize: '1.75rem', margin: '0.4rem 0', color: '#0f172a' }}>{formatMoney(sales?.sales_minor || 0)}</h3>
          <small style={{ color: '#64748b' }}>{sales?.orders_count || 0} completed orders</small>
        </div>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>WBOX Bridge Health</span>
          <h3 style={{ fontSize: '1.25rem', margin: '0.6rem 0', color: wboxStatus?.credentials_configured ? '#16a34a' : '#eab308' }}>
            {wboxStatus?.credentials_configured ? 'Configured & Active' : 'Pending Config'}
          </h3>
          <small style={{ color: '#64748b' }}>Local File Connector</small>
        </div>
      </div>

      {/* Recent Security & Platform Audit */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Recent Platform Events</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '0.6rem' }}>Event Action</th>
              <th style={{ padding: '0.6rem' }}>Actor</th>
              <th style={{ padding: '0.6rem' }}>Entity</th>
              <th style={{ padding: '0.6rem' }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.6rem', fontWeight: 600 }}>{log.action}</td>
                <td style={{ padding: '0.6rem' }}>{log.actor_name || 'System'}</td>
                <td style={{ padding: '0.6rem' }}>{log.entity_type} #{log.entity_id}</td>
                <td style={{ padding: '0.6rem', color: '#64748b' }}>{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const reload = () => {
    if (!token) return
    setLoading(true)
    getStores(token)
      .then((r) => setStores(r.stores))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [token])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !name || !code) return
    setSubmitting(true)
    try {
      await createStore(token, { name, code, timezone })
      setName('')
      setCode('')
      reload()
    } catch (err: any) {
      alert(err.message)
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
      <form onSubmit={handleCreate} style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Create New Store Branch</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.3rem' }}>Store Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. South Branch" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.3rem' }}>Store Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} required placeholder="e.g. SOUTH" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.3rem' }}>Timezone</label>
            <input value={timezone} onChange={(e) => setTimezone(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          <button type="submit" disabled={submitting} style={{ padding: '0.55rem 1.25rem', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
            {submitting ? 'Creating…' : '+ Add Store'}
          </button>
        </div>
      </form>

      {/* Stores List */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Active Branches ({stores.length})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '0.6rem' }}>ID</th>
              <th style={{ padding: '0.6rem' }}>Name</th>
              <th style={{ padding: '0.6rem' }}>Code</th>
              <th style={{ padding: '0.6rem' }}>Timezone</th>
              <th style={{ padding: '0.6rem' }}>Status</th>
              <th style={{ padding: '0.6rem' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((st) => (
              <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.6rem' }}>#{st.id}</td>
                <td style={{ padding: '0.6rem', fontWeight: 600 }}>{st.name}</td>
                <td style={{ padding: '0.6rem' }}><code>{st.code}</code></td>
                <td style={{ padding: '0.6rem', color: '#64748b' }}>{st.timezone}</td>
                <td style={{ padding: '0.6rem' }}>
                  <span style={{ padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: st.active ? '#dcfce7' : '#fee2e2', color: st.active ? '#16a34a' : '#ef4444' }}>
                    {st.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td style={{ padding: '0.6rem' }}>
                  <button onClick={() => toggleActive(st)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
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
  const [loading, setLoading] = useState(true)

  const reload = () => {
    if (!token) return
    setLoading(true)
    Promise.all([
      getUsers(token).then((r) => setUsers(r.users)),
      getStores(token).then((r) => setStores(r.stores)),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [token])

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
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Platform Users ({users.length})</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
            <th style={{ padding: '0.6rem' }}>Name</th>
            <th style={{ padding: '0.6rem' }}>Email</th>
            <th style={{ padding: '0.6rem' }}>System Role</th>
            <th style={{ padding: '0.6rem' }}>Assigned Store</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '0.6rem', fontWeight: 600 }}>{u.name}</td>
              <td style={{ padding: '0.6rem' }}>{u.email}</td>
              <td style={{ padding: '0.6rem' }}>
                <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <option value="store_admin">Store Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </td>
              <td style={{ padding: '0.6rem' }}>
                <select value={u.store_id ?? ''} onChange={(e) => handleStoreChange(u.id, e.target.value)} style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <option value="">(No store assigned)</option>
                  {stores.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    getPlatformTerminals(token)
      .then((r) => setTerminals(r.terminals))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Hardware Terminals Across Stores</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
            <th style={{ padding: '0.6rem' }}>Terminal ID</th>
            <th style={{ padding: '0.6rem' }}>Name</th>
            <th style={{ padding: '0.6rem' }}>Store</th>
            <th style={{ padding: '0.6rem' }}>WBOX Kiosk #</th>
            <th style={{ padding: '0.6rem' }}>Status</th>
            <th style={{ padding: '0.6rem' }}>Telemetry</th>
          </tr>
        </thead>
        <tbody>
          {terminals.map((t) => (
            <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '0.6rem', fontWeight: 600 }}><code>{t.id}</code></td>
              <td style={{ padding: '0.6rem' }}>{t.name}</td>
              <td style={{ padding: '0.6rem' }}>{t.store_name || `Store #${t.store_id}`}</td>
              <td style={{ padding: '0.6rem' }}><code>{t.wbox_kiosk_number}</code></td>
              <td style={{ padding: '0.6rem' }}>
                <span style={{ padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: t.is_online ? '#dcfce7' : '#fee2e2', color: t.is_online ? '#16a34a' : '#ef4444' }}>
                  {t.is_online ? 'ONLINE' : 'OFFLINE'}
                </span>
              </td>
              <td style={{ padding: '0.6rem', color: '#64748b' }}>
                {t.last_heartbeat_at ? new Date(t.last_heartbeat_at).toLocaleTimeString() : 'Never'}
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
  const [wbox, setWbox] = useState<any>(null)

  useEffect(() => {
    if (!token) return
    getWboxStatus(token).then((r) => setWbox(r.connection)).catch(() => null)
  }, [token])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>WBOX POS Bridge Integration</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Monitors the local file system connector between Laravel and the store-side legacy WBOX POS machine.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <strong style={{ display: 'block', marginBottom: '0.3rem' }}>Request Folder:</strong>
            <code>{wbox?.request_path?.path || 'Not configured'}</code>
            <div style={{ marginTop: '0.5rem', color: wbox?.request_path?.writable ? '#16a34a' : '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
              {wbox?.request_path?.writable ? '✓ Writable' : '✕ Not Accessible'}
            </div>
          </div>
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <strong style={{ display: 'block', marginBottom: '0.3rem' }}>Response Folder:</strong>
            <code>{wbox?.response_path?.path || 'Not configured'}</code>
            <div style={{ marginTop: '0.5rem', color: wbox?.response_path?.readable ? '#16a34a' : '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
              {wbox?.response_path?.readable ? '✓ Readable' : '✕ Not Accessible'}
            </div>
          </div>
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <strong style={{ display: 'block', marginBottom: '0.3rem' }}>Auth Token Encryption:</strong>
            <div style={{ marginTop: '0.5rem', color: wbox?.credentials_configured ? '#16a34a' : '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
              {wbox?.credentials_configured ? '✓ Stored Encrypted' : '✕ Not Set'}
            </div>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Platform Gross Sales</span>
          <h3 style={{ fontSize: '1.75rem', margin: '0.4rem 0', color: '#0f172a' }}>{formatMoney(summary?.sales_minor || 0)}</h3>
        </div>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Paid Orders</span>
          <h3 style={{ fontSize: '1.75rem', margin: '0.4rem 0', color: '#0f172a' }}>{summary?.orders_count || 0}</h3>
        </div>
      </div>

      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Revenue Breakdown by Store</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '0.6rem' }}>Store Name</th>
              <th style={{ padding: '0.6rem' }}>Orders Count</th>
              <th style={{ padding: '0.6rem' }}>Total Sales</th>
            </tr>
          </thead>
          <tbody>
            {byStore.map((st) => (
              <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.6rem', fontWeight: 600 }}>{st.name}</td>
                <td style={{ padding: '0.6rem' }}>{st.orders_count}</td>
                <td style={{ padding: '0.6rem', fontWeight: 700, color: '#ea580c' }}>{formatMoney(st.sales_minor)}</td>
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

  const reload = () => {
    if (!token) return
    getAuditLogs(token, actionFilter || undefined).then((r) => setLogs(r.data))
  }

  useEffect(() => {
    reload()
  }, [token, actionFilter])

  return (
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>System Audit Trail</h3>
        <input
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="Filter by action (e.g. order.status_changed)…"
          style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', width: '300px' }}
        />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
            <th style={{ padding: '0.6rem' }}>Action</th>
            <th style={{ padding: '0.6rem' }}>Actor</th>
            <th style={{ padding: '0.6rem' }}>Entity</th>
            <th style={{ padding: '0.6rem' }}>Changes (Before / After)</th>
            <th style={{ padding: '0.6rem' }}>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '0.6rem', fontWeight: 600 }}><code>{log.action}</code></td>
              <td style={{ padding: '0.6rem' }}>{log.actor_name || 'System'} ({log.actor_email || 'n/a'})</td>
              <td style={{ padding: '0.6rem' }}>{log.entity_type} #{log.entity_id}</td>
              <td style={{ padding: '0.6rem', fontSize: '0.8rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {log.after || log.before || '—'}
              </td>
              <td style={{ padding: '0.6rem', color: '#64748b' }}>{new Date(log.created_at).toLocaleString()}</td>
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
  const user = useAdminStore((s) => s.user)
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
      useAdminStore.getState().setSession(res.token, res.user)
      alert(`Impersonation active for ${res.user.name}. You are now operating as this store admin.`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <form onSubmit={handleImpersonate} style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Audited Super Admin Impersonation</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Temporarily assume a store manager identity to diagnose issues. All actions are audited. Maximum duration is 30 minutes.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.3rem' }}>Target User (Store Admin)</label>
            <select value={targetUserId} onChange={(e) => setTargetUserId(Number(e.target.value))} required style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="">Select a user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email}) — Store #{u.store_id || 'n/a'}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.3rem' }}>Target Store Context</label>
            <select value={targetStoreId} onChange={(e) => setTargetStoreId(Number(e.target.value))} required style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="">Select target store…</option>
              {stores.map((st) => (
                <option key={st.id} value={st.id}>{st.name} ({st.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.3rem' }}>Mandatory Audit Reason</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={5} placeholder="e.g. Assisting store with catalog pricing dispute" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>

          <button type="submit" disabled={submitting} style={{ padding: '0.65rem 1.5rem', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}>
            {submitting ? 'Starting Session…' : 'Start Audited Impersonation'}
          </button>
        </div>
      </form>
    </div>
  )
}
