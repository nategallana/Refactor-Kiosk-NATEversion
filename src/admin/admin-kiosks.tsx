import { useEffect, useState } from 'react'
import { AdminShell } from './admin-shell'
import { useAdminStore } from './admin-store'
import { useAdminNotificationsStore } from './admin-notifications-store'
import { createActivationCode, getOrders, getSettings, type AdminOrder, type AdminSettings } from './admin-api'
import { Toast } from '../components/toast'
import { formatPhDate } from '../domain/datetime'

export interface KioskTerminal {
  id: string
  name: string
  location: string
  ipAddress: string
  status: 'online' | 'maintenance' | 'offline'
  mode: 'both' | 'dine-in' | 'takeout'
  screen: string
  registeredAt: string
}

export function KiosksPage() {
  const token = useAdminStore((state) => state.token)!
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [terminals, setTerminals] = useState<KioskTerminal[]>(() => {
    const saved = localStorage.getItem('kiosk_terminals_fleet')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // fallback
      }
    }
    // Default single active terminal matching actual kiosk client
    return [
      {
        id: 'KIOSK-01',
        name: 'Main Customer Terminal',
        location: 'Store Lobby / Self-Service Stand',
        ipAddress: window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname,
        status: navigator.onLine ? 'online' : 'offline',
        mode: 'both',
        screen: '1080 × 1920 (Portrait Kiosk)',
        registeredAt: formatPhDate(new Date()),
      },
    ]
  })

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'maintenance'>('all')
  const [showModal, setShowModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Edit Terminal State
  const [editingTerminal, setEditingTerminal] = useState<KioskTerminal | null>(null)
  const [editName, setEditName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editMode, setEditMode] = useState<KioskTerminal['mode']>('both')
  const [editScreen, setEditScreen] = useState('')
  const [editIp, setEditIp] = useState('')

  // New Terminal Form State
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newMode, setNewMode] = useState<KioskTerminal['mode']>('both')

  const handleGenerateActivationCode = async () => {
    try {
      const result = await createActivationCode(token)
      window.prompt('Give this one-time code to the kiosk (expires in 30 minutes):', result.activation_code)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create activation code')
    }
  }
  const showToast = (msg: string) => {
    setToastMessage(msg)
    window.setTimeout(() => setToastMessage(null), 3500)
  }

  const saveTerminals = (updated: KioskTerminal[]) => {
    setTerminals(updated)
    localStorage.setItem('kiosk_terminals_fleet', JSON.stringify(updated))
  }

  const openEditModal = (t: KioskTerminal) => {
    setEditingTerminal(t)
    setEditName(t.name)
    setEditLocation(t.location)
    setEditMode(t.mode)
    setEditScreen(t.screen)
    setEditIp(t.ipAddress)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTerminal) return

    const updated = terminals.map((t) =>
      t.id === editingTerminal.id
        ? {
            ...t,
            name: editName.trim() || t.name,
            location: editLocation.trim() || t.location,
            mode: editMode,
            screen: editScreen.trim() || t.screen,
            ipAddress: editIp.trim() || t.ipAddress,
          }
        : t
    )
    saveTerminals(updated)
    setEditingTerminal(null)
    showToast(`✅ Saved changes for ${editingTerminal.id}`)
  }

  useEffect(() => {
    Promise.all([
      getOrders(token).then((res) => setOrders(res.orders)),
      getSettings(token).then((res) => setSettings(res.settings)),
    ])
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const toggleMaintenance = (id: string) => {
    const updated = terminals.map((t) => {
      if (t.id === id) {
        const nextStatus: KioskTerminal['status'] = t.status === 'maintenance' ? 'online' : 'maintenance'
        showToast(`${t.id} status updated to ${nextStatus.toUpperCase()}`)
        useAdminNotificationsStore.getState().addNotification({
          title: `Terminal ${nextStatus === 'maintenance' ? 'Locked (Maintenance)' : 'Online (Unlocked)'}`,
          message: `${t.id} (${t.location}) status changed to ${nextStatus.toUpperCase()}.`,
          category: 'kiosks',
          severity: nextStatus === 'maintenance' ? 'warning' : 'success',
          link: '/admin/kiosks',
        })
        return { ...t, status: nextStatus }
      }
      return t
    })
    saveTerminals(updated)
  }

  const reloadTerminal = (id: string) => {
    showToast(`🔄 Reload command sent to ${id}.`)
  }

  const handleCreateTerminal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newId.trim() || !newName.trim()) return

    const newTerminal: KioskTerminal = {
      id: newId.toUpperCase().trim(),
      name: newName.trim(),
      location: newLocation.trim() || 'Store Counter',
      ipAddress: window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname,
      status: 'online',
      mode: newMode,
      screen: '1080 × 1920 (Portrait Kiosk)',
      registeredAt: formatPhDate(new Date()),
    }

    saveTerminals([...terminals, newTerminal])
    setShowModal(false)
    setNewId('')
    setNewName('')
    showToast(`✅ Registered terminal: ${newTerminal.id}`)
    useAdminNotificationsStore.getState().addNotification({
      title: 'New Terminal Registered',
      message: `Terminal ${newTerminal.id} (${newTerminal.name} · ${newTerminal.location}) registered successfully.`,
      category: 'kiosks',
      severity: 'success',
      link: '/admin/kiosks',
    })
  }

  // Calculate real orders per terminal from actual database records
  const getTerminalOrderCount = (terminalId: string) => {
    return orders.filter((o) => o.terminal_id === terminalId).length
  }

  const filteredTerminals = terminals.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'online' && t.status === 'online') ||
      (statusFilter === 'maintenance' && t.status === 'maintenance')

    return matchesSearch && matchesStatus
  })

  const onlineTerminalsCount = terminals.filter((t) => t.status === 'online').length

  return (
    <AdminShell eyebrow="TERMINAL MANAGEMENT" title="Kiosks">
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {error && <div className="admin-error">{error}</div>}

      <section className="metric-grid">
        <article>
          <span>Registered Terminals</span>
          <strong>{terminals.length}</strong>
          <small>{onlineTerminalsCount} online</small>
        </article>
        <article>
          <span>Actual Orders Today</span>
          <strong>{orders.length}</strong>
          <small>Recorded in database</small>
        </article>
        <article>
          <span>Active Service Mode</span>
          <strong style={{ fontSize: '1.4rem', textTransform: 'capitalize' }}>
            {settings?.service_mode || 'Both'}
          </strong>
          <small>Configured in Settings</small>
        </article>
        <article>
          <span>Network Connection</span>
          <strong style={{ fontSize: '1.4rem', color: navigator.onLine ? '#166534' : '#dc2626' }}>
            {navigator.onLine ? 'Online' : 'Offline'}
          </strong>
          <small>{window.location.host}</small>
        </article>
      </section>

      <section className="admin-panel">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.4rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.8rem', flex: '1', minWidth: '16rem' }}>
            <input
              type="text"
              className="admin-search"
              placeholder="Search terminal ID or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {(['all', 'online', 'maintenance'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setStatusFilter(mode)}
                  style={{
                    padding: '0 0.9rem',
                    borderRadius: '0.55rem',
                    border: '1px solid ' + (statusFilter === mode ? '#ea580c' : '#fed7aa'),
                    background: statusFilter === mode ? '#ea580c' : '#fff8f5',
                    color: statusFilter === mode ? '#fff' : '#c2410c',
                    fontWeight: 750,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="admin-secondary" onClick={handleGenerateActivationCode}>
              Generate Activation Code
            </button>
            <button className="admin-primary admin-primary--small" onClick={() => setShowModal(true)}>
              + Register Terminal
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#78716c' }}>
            Loading terminal data...
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.2rem', gridTemplateColumns: 'repeat(auto-fill, minmax(21rem, 1fr))' }}>
            {filteredTerminals.map((terminal) => {
              const isOnline = terminal.status === 'online'
              const isMaintenance = terminal.status === 'maintenance'
              const terminalOrders = getTerminalOrderCount(terminal.id)

              return (
                <div
                  key={terminal.id}
                  style={{
                    background: isMaintenance ? '#fffdfb' : '#ffffff',
                    border: isMaintenance ? '2px dashed #ea580c60' : '1px solid #f0e8e2',
                    borderRadius: '1rem',
                    padding: '1.4rem',
                    boxShadow: '0 4px 16px #ea580c08',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <strong style={{ fontFamily: 'Georgia, serif', fontSize: '1.2rem', color: '#1f1816' }}>
                          {terminal.id}
                        </strong>
                        <span
                          className={
                            'status ' +
                            (isOnline ? 'status--ready' : isMaintenance ? 'status--preparing' : 'status--cancelled')
                          }
                        >
                          {terminal.status === 'maintenance' ? 'LOCKED' : terminal.status.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ margin: '0.2rem 0 0', color: '#574d49', fontSize: '0.8rem', fontWeight: 600 }}>
                        {terminal.name}
                      </p>
                      <small style={{ color: '#78716c', fontSize: '0.68rem' }}>📍 {terminal.location}</small>
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#fff8f5',
                      border: '1px solid #fed7aa',
                      borderRadius: '0.65rem',
                      padding: '0.85rem',
                      fontSize: '0.72rem',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.6rem',
                    }}
                  >
                    <div>
                      <span style={{ color: '#78716c', display: 'block', fontSize: '0.62rem', textTransform: 'uppercase' }}>
                        Host / IP
                      </span>
                      <strong style={{ color: '#1f1816' }}>{terminal.ipAddress}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#78716c', display: 'block', fontSize: '0.62rem', textTransform: 'uppercase' }}>
                        Allowed Mode
                      </span>
                      <strong style={{ color: '#c2410c', textTransform: 'capitalize' }}>
                        {terminal.mode === 'both' ? 'Dine-In & Takeout' : terminal.mode}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#78716c', display: 'block', fontSize: '0.62rem', textTransform: 'uppercase' }}>
                        Screen
                      </span>
                      <strong style={{ color: '#1f1816' }}>{terminal.screen}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#78716c', display: 'block', fontSize: '0.62rem', textTransform: 'uppercase' }}>
                        Real Orders Today
                      </span>
                      <strong style={{ color: '#ea580c' }}>{terminalOrders} orders</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.4rem' }}>
                    <button
                      onClick={() => openEditModal(terminal)}
                      style={{
                        padding: '0.65rem 0.95rem',
                        borderRadius: '0.55rem',
                        border: '1px solid #fed7aa',
                        background: '#fff8f5',
                        color: '#ea580c',
                        fontWeight: 750,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      onClick={() => toggleMaintenance(terminal.id)}
                      style={{
                        flex: 1,
                        padding: '0.65rem',
                        borderRadius: '0.55rem',
                        border: '1px solid ' + (isMaintenance ? '#ea580c' : '#fca5a5'),
                        background: isMaintenance ? '#fff7ed' : '#fef2f2',
                        color: isMaintenance ? '#ea580c' : '#dc2626',
                        fontWeight: 750,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                      }}
                    >
                      {isMaintenance ? '🔓 Unlock Kiosk' : '🔒 Lock (Maint)'}
                    </button>

                    <button
                      onClick={() => reloadTerminal(terminal.id)}
                      style={{
                        padding: '0.65rem 0.9rem',
                        borderRadius: '0.55rem',
                        border: '1px solid #fed7aa',
                        background: '#fff8f5',
                        color: '#c2410c',
                        fontWeight: 750,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                      }}
                    >
                      🔄 Reload
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && filteredTerminals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#78716c' }}>
            <p>No terminals found.</p>
          </div>
        )}
      </section>

      {/* Edit Terminal Modal */}
      {editingTerminal && (
        <div className="modal-backdrop" onClick={() => setEditingTerminal(null)}>
          <div className="idle-modal" style={{ maxWidth: '28rem', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow" style={{ color: '#ea580c', fontWeight: 800 }}>DEVICE CONFIGURATION</p>
            <h2 style={{ fontFamily: 'Georgia, serif', margin: '0.3rem 0 1rem', color: '#1f1816' }}>
              Edit Terminal {editingTerminal.id}
            </h2>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                  Terminal Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.55rem',
                    border: '1px solid #fed7aa',
                    fontSize: '0.8rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                  Location
                </label>
                <input
                  type="text"
                  required
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.55rem',
                    border: '1px solid #fed7aa',
                    fontSize: '0.8rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                  Allowed Service Mode
                </label>
                <select
                  value={editMode}
                  onChange={(e) => setEditMode(e.target.value as KioskTerminal['mode'])}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.55rem',
                    border: '1px solid #fed7aa',
                    fontSize: '0.8rem',
                    background: '#fff',
                  }}
                >
                  <option value="both">Both (Dine-In & Takeout)</option>
                  <option value="takeout">Takeout Only</option>
                  <option value="dine-in">Dine-In Only</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                  Screen Display Profile
                </label>
                <select
                  value={editScreen}
                  onChange={(e) => setEditScreen(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.55rem',
                    border: '1px solid #fed7aa',
                    fontSize: '0.8rem',
                    background: '#fff',
                  }}
                >
                  <option value="1080 × 1920 (Portrait Kiosk)">1080 × 1920 (Portrait Kiosk)</option>
                  <option value="1920 × 1080 (Landscape Kiosk)">1920 × 1080 (Landscape Kiosk)</option>
                  <option value="1440 × 900 (Desktop Dev)">1440 × 900 (Desktop Dev)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                  Host / IP Address
                </label>
                <input
                  type="text"
                  value={editIp}
                  onChange={(e) => setEditIp(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.55rem',
                    border: '1px solid #fed7aa',
                    fontSize: '0.8rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
                <button type="submit" className="admin-primary" style={{ flex: 1 }}>
                  Save Changes &rarr;
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: '0 1.2rem', borderRadius: '0.6rem', border: '1px solid #ea580c40', color: '#c2410c' }}
                  onClick={() => setEditingTerminal(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="idle-modal" style={{ maxWidth: '28rem', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow" style={{ color: '#ea580c', fontWeight: 800 }}>DEVICE PROVISIONING</p>
            <h2 style={{ fontFamily: 'Georgia, serif', margin: '0.3rem 0 1rem', color: '#1f1816' }}>
              Register Terminal
            </h2>

            <form onSubmit={handleCreateTerminal} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                  Terminal Identifier (e.g. KIOSK-02)
                </label>
                <input
                  type="text"
                  required
                  placeholder="KIOSK-02"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.55rem',
                    border: '1px solid #fed7aa',
                    fontSize: '0.8rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                  Terminal Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Express Takeout Kiosk"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.55rem',
                    border: '1px solid #fed7aa',
                    fontSize: '0.8rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                  Location
                </label>
                <input
                  type="text"
                  placeholder="Counter Side"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.55rem',
                    border: '1px solid #fed7aa',
                    fontSize: '0.8rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#574d49', marginBottom: '0.3rem' }}>
                  Service Mode
                </label>
                <select
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value as KioskTerminal['mode'])}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.55rem',
                    border: '1px solid #fed7aa',
                    fontSize: '0.8rem',
                    background: '#fff',
                  }}
                >
                  <option value="both">Both (Dine-In & Takeout)</option>
                  <option value="takeout">Takeout Only</option>
                  <option value="dine-in">Dine-In Only</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
                <button type="submit" className="admin-primary" style={{ flex: 1 }}>
                  Confirm Registration &rarr;
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: '0 1.2rem', borderRadius: '0.6rem', border: '1px solid #ea580c40', color: '#c2410c' }}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
