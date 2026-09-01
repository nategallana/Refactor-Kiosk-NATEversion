import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react'
import { getSettings, getWboxStatus, updateSettings, type AdminSettings, type AdminSettingsUpdate } from './admin-api'
import { AdminShell } from './admin-shell'
import { useAdminStore } from './admin-store'
import { Toast, type ToastType } from '../components/toast'
import { useKioskStore } from '../store/kiosk-store'
import { isVideoUrl } from '../domain/media'
import { useAdminNotificationsStore } from './admin-notifications-store'
import { AVAILABLE_TIMEZONES, getActiveTimezone, setActiveTimezone } from '../domain/datetime'

type EditableSettings = AdminSettingsUpdate & {
  wbox_auth_token_configured: boolean
  wbox_auth_token: string
}

const editable = ({ id: _id, created_at: _createdAt, updated_at: _updatedAt, ...values }: AdminSettings): EditableSettings => {
  void _id
  void _createdAt
  void _updatedAt
  return {
    ...values,
    welcome_background_url: values.welcome_background_url ?? null,
    wbox_auth_token_configured: Boolean(values.wbox_auth_token_configured),
    wbox_auth_token: '',
  }
}

const PRESET_BACKGROUNDS = [
  {
    name: 'Warm Bistro Ambience',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=60',
    isVideo: false,
  },
  {
    name: 'Gourmet Burger Kitchen',
    url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&q=60',
    isVideo: false,
  },
  {
    name: 'Rustic Wood & Slate',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=60',
    isVideo: false,
  },
  {
    name: 'Cozy Modern Cafe',
    url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=200&q=60',
    isVideo: false,
  },
]

export function SettingsPage() {
  const token = useAdminStore((state) => state.token)!
  const [settings, setSettings] = useState<EditableSettings | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [saving, setSaving] = useState(false)
  const [checkingWbox, setCheckingWbox] = useState(false)
  const [wboxStatus, setWboxStatus] = useState('')
  const [wboxReady, setWboxReady] = useState<boolean | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type })
  }

  useEffect(() => {
    getSettings(token)
      .then(({ settings: loaded }) => {
        const parsed = editable(loaded)
        const localBg = localStorage.getItem('kiosk_welcome_background')
        if (!parsed.welcome_background_url && localBg) {
          parsed.welcome_background_url = localBg
        }
        setSettings(parsed)
      })
      .catch((reason: Error) => setError(reason.message))
  }, [token])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!settings) return
    setSaving(true)
    setError('')
    setSaved('')
    try {
      const { wbox_auth_token_configured: _configured, ...payload } = settings
      void _configured
      const result = await updateSettings(token, payload)
      const updated = editable(result.settings)
      setSettings(updated)

      // Sync local storage & kiosk store
      if (updated.welcome_background_url) {
        localStorage.setItem('kiosk_welcome_background', updated.welcome_background_url)
      } else {
        localStorage.removeItem('kiosk_welcome_background')
      }
      useKioskStore.getState().fetchSettings().catch(() => {})
      setSaved('Settings saved successfully.')
      showToast('Settings saved successfully.', 'success')
      useAdminNotificationsStore.getState().addNotification({
        title: 'System Settings Saved',
        message: `Brand configuration for "${updated.brand_name}" and kiosk behavior synchronized.`,
        category: 'system',
        severity: 'success',
        link: '/admin/settings',
      })
    } catch (reason) {
      const msg = reason instanceof Error ? reason.message : 'Unable to save settings.'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleBgMediaUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setSettings((prev: EditableSettings | null) => (prev ? { ...prev, welcome_background_url: result } : prev))
      localStorage.setItem('kiosk_welcome_background', result)
      const isVid = file.type.startsWith('video/')
      showToast(`📸 Custom welcome background ${isVid ? 'video' : 'image'} uploaded.`, 'info')
    }
    reader.readAsDataURL(file)
  }

  const chooseFolder = async (field: 'wbox_request_path' | 'wbox_response_path') => {
    try {
      if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
        // @ts-expect-error File System Access API
        const dirHandle = await window.showDirectoryPicker()
        const folderName = dirHandle.name
        const defaultPath = `C:\\WBOX\\${folderName}`
        setSettings((prev: EditableSettings | null) => (prev ? { ...prev, [field]: defaultPath } : prev))
        showToast(`📁 Selected directory "${folderName}"`, 'info')
        return
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    }

    // Fallback directory selection
    const fieldLabel = field === 'wbox_request_path' ? 'Request' : 'Response'
    const fallback = window.prompt(
      `Enter path for ${fieldLabel} folder:`,
      settings?.[field] || (field === 'wbox_request_path' ? 'C:\\WBOX\\Request' : 'C:\\WBOX\\Response')
    )
    if (fallback !== null) {
      setSettings((prev: EditableSettings | null) => (prev ? { ...prev, [field]: fallback.trim() || null } : prev))
      showToast(`📁 Updated ${fieldLabel} folder path`, 'info')
    }
  }

  const checkWbox = async () => {
    setCheckingWbox(true)
    setWboxStatus('')
    try {
      const { connection } = await getWboxStatus(token)
      const requestReady = connection.request_path.exists && connection.request_path.writable
      const responseReady = connection.response_path.exists && connection.response_path.readable
      const ready = requestReady && responseReady && connection.credentials_configured
      setWboxReady(ready)
      const msg = ready
        ? 'WBOX folders and credentials are ready.'
        : 'WBOX is not ready. Save valid folders and credentials, then test again.'
      setWboxStatus(msg)
      showToast(msg, ready ? 'success' : 'error')
    } catch (reason) {
      setWboxReady(false)
      const msg = reason instanceof Error ? reason.message : 'Unable to test WBOX settings.'
      setWboxStatus(msg)
      showToast(msg, 'error')
    } finally {
      setCheckingWbox(false)
    }
  }

  return (
    <AdminShell title="Settings" eyebrow="CONFIGURATION">
      <Toast
        message={toast?.message ?? null}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      {!settings && !error && <div className="admin-state">Loading settings...</div>}
      {error && !settings && <div className="admin-error">{error}</div>}
      {settings && (
        <form className="settings-form" onSubmit={save}>
          {/* Header without top save button */}
          <div className="settings-form__heading">
            <div>
              <h2>System configuration</h2>
              <p>Changes apply to registered kiosks after their next configuration refresh.</p>
            </div>
          </div>

          {error && (
            <div className="admin-error" role="alert">
              {error}
            </div>
          )}
          {saved && (
            <div className="admin-success" role="status">
              {saved}
            </div>
          )}

          {/* Section 01: Business Details */}
          <section className="settings-section">
            <div className="settings-section__intro">
              <span>01</span>
              <div>
                <h3>Business details</h3>
                <p>Branding and service defaults shown across the ordering experience.</p>
              </div>
            </div>
            <div className="settings-fields">
              <label className="settings-field settings-field--wide">
                Business name
                <input
                  value={settings.brand_name}
                  maxLength={80}
                  required
                  onChange={(event) => setSettings({ ...settings, brand_name: event.target.value })}
                />
              </label>
              <label className="settings-field">
                Service mode
                <select
                  value={settings.service_mode}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      service_mode: event.target.value as EditableSettings['service_mode'],
                    })
                  }
                >
                  <option value="both">Dine in and takeout</option>
                  <option value="dine-in">Dine in only</option>
                  <option value="takeout">Takeout only</option>
                </select>
              </label>
              <label className="settings-field">
                Tax rate (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={settings.tax_rate_basis_points / 100}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      tax_rate_basis_points: Math.round(Number(event.target.value) * 100),
                    })
                  }
                />
              </label>
              <label className="settings-field">
                Currency
                <input value={settings.currency} disabled />
              </label>
              <label className="settings-field">
                Store Timezone
                <select
                  value={settings.timezone || getActiveTimezone()}
                  onChange={(event) => {
                    const nextTz = event.target.value
                    setSettings({
                      ...settings,
                      timezone: nextTz,
                    })
                    setActiveTimezone(nextTz)
                    showToast(`🕒 Store timezone set to ${nextTz}`, 'info')
                  }}
                >
                  {AVAILABLE_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label} ({tz.offset})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Section 02: Welcome Screen Background (Controls on Left, Portrait Preview on Right) */}
          <section className="settings-section">
            <div className="settings-section__intro">
              <span>02</span>
              <div>
                <h3>Welcome screen background</h3>
                <p>Change the background image displayed to customers on the kiosk welcome page.</p>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.4fr) minmax(13rem, 180px)',
                gap: '1.5rem',
                alignItems: 'start',
              }}
            >
              {/* Left Column: All Controls & Presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <label className="settings-field">
                    Background Image URL
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        style={{ flex: 1 }}
                        value={settings.welcome_background_url ?? ''}
                        placeholder="https://... or upload custom image"
                        onChange={(event) =>
                          setSettings({
                            ...settings,
                            welcome_background_url: event.target.value.trim() || null,
                          })
                        }
                      />
                      <label
                        htmlFor="welcome-bg-file-input"
                        style={{
                          background: '#fff7ed',
                          border: '1.5px solid #fed7aa',
                          color: '#ea580c',
                          borderRadius: '0.55rem',
                          padding: '0 0.95rem',
                          minHeight: '2.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontWeight: 750,
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        📁 Upload Media (Image / Video)
                      </label>
                      <input
                        id="welcome-bg-file-input"
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleBgMediaUpload}
                        style={{ display: 'none' }}
                      />
                      {settings.welcome_background_url && (
                        <button
                          type="button"
                          onClick={() => {
                            setSettings({ ...settings, welcome_background_url: null })
                            localStorage.removeItem('kiosk_welcome_background')
                            showToast('Reset welcome background to default theme.', 'info')
                          }}
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            borderRadius: '0.55rem',
                            padding: '0 0.85rem',
                            minHeight: '2.8rem',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ✕ Reset
                        </button>
                      )}
                    </div>
                  </label>
                </div>

                {/* Preset Wallpaper Gallery */}
                <div>
                  <small
                    style={{
                      color: '#ea580c',
                      fontWeight: 800,
                      fontSize: '0.65rem',
                      letterSpacing: '0.08em',
                      display: 'block',
                      marginBottom: '0.5rem',
                    }}
                  >
                    OR SELECT A PRESET BACKGROUND
                  </small>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.65rem',
                    }}
                  >
                    {PRESET_BACKGROUNDS.map((preset) => {
                      const isSelected = settings.welcome_background_url === preset.url
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setSettings({ ...settings, welcome_background_url: preset.url })
                            showToast(`Selected "${preset.name}" preset`, 'info')
                          }}
                          style={{
                            background: isSelected ? '#fff7ed' : '#ffffff',
                            border: isSelected ? '2px solid #ea580c' : '1px solid #fed7aa',
                            borderRadius: '0.6rem',
                            padding: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            cursor: 'pointer',
                            boxShadow: isSelected ? '0 0 0 2px #fed7aa' : '0 1px 3px rgba(0,0,0,0.04)',
                            textAlign: 'left',
                          }}
                        >
                          <div
                            style={{
                              width: '3rem',
                              height: '2.5rem',
                              borderRadius: '0.4rem',
                              backgroundImage: `url("${preset.thumb}")`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 750,
                              color: isSelected ? '#ea580c' : '#292524',
                              lineHeight: 1.25,
                            }}
                          >
                            {preset.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Authentic Fast-Food Self-Ordering Kiosk Stand Preview Mockup */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '190px' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                    filter: 'drop-shadow(0 14px 28px rgba(0, 0, 0, 0.16))',
                  }}
                >
                  {/* Top Kiosk Header / Barcode Scanner Bay */}
                  <div
                    style={{
                      width: '182px',
                      height: '14px',
                      background: 'linear-gradient(180deg, #1c1917 0%, #292524 100%)',
                      borderTopLeftRadius: '0.65rem',
                      borderTopRightRadius: '0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 0.65rem',
                      border: '1px solid #44403c',
                      borderBottom: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Status Power LED */}
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                    {/* Optical Barcode Scanner Window */}
                    <div
                      style={{
                        width: '28px',
                        height: '4px',
                        background: '#09090b',
                        borderRadius: '2px',
                        border: '1px solid #52525b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div style={{ width: '3px', height: '2px', background: '#38bdf8', borderRadius: '1px' }} />
                    </div>
                    {/* Terminal Mic / Speaker Grill */}
                    <div style={{ display: 'flex', gap: '1.5px' }}>
                      <div style={{ width: '2px', height: '2px', borderRadius: '50%', background: '#78716c' }} />
                      <div style={{ width: '2px', height: '2px', borderRadius: '50%', background: '#78716c' }} />
                      <div style={{ width: '2px', height: '2px', borderRadius: '50%', background: '#78716c' }} />
                    </div>
                  </div>

                  {/* Kiosk Touch Screen Display Bezel */}
                  <div
                    style={{
                      width: '182px',
                      height: '265px',
                      background: '#1c1917',
                      borderLeft: '4px solid #292524',
                      borderRight: '4px solid #292524',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      backgroundImage: settings.welcome_background_url && !isVideoUrl(settings.welcome_background_url)
                        ? `linear-gradient(rgba(20, 10, 8, 0.45), rgba(20, 10, 8, 0.75)), url("${settings.welcome_background_url}")`
                        : '#fffaf5',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      padding: '0.65rem 0.55rem',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Video Background Mockup */}
                    {isVideoUrl(settings.welcome_background_url) && settings.welcome_background_url && (
                      <>
                        <video
                          src={settings.welcome_background_url}
                          autoPlay
                          loop
                          muted
                          playsInline
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: 0,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(rgba(20, 10, 8, 0.45), rgba(20, 10, 8, 0.75))',
                            zIndex: 0,
                          }}
                        />
                      </>
                    )}

                    {/* Touch Screen Top Header Indicator */}
                    <div
                      style={{
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 0.15rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.42rem',
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          color: settings.welcome_background_url ? '#fed7aa' : '#ea580c',
                          background: settings.welcome_background_url ? 'rgba(0,0,0,0.45)' : '#fff7ed',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '999px',
                        }}
                      >
                        KIOSK #01
                      </span>
                      <span
                        style={{
                          fontSize: '0.42rem',
                          fontWeight: 700,
                          color: settings.welcome_background_url ? '#ffffff' : '#78716c',
                        }}
                      >
                        TOUCH TO ORDER
                      </span>
                    </div>

                    {/* Brand & Headline */}
                    <div style={{ zIndex: 1, margin: '0.2rem 0' }}>
                      <span
                        style={{
                          fontSize: '0.44rem',
                          fontWeight: 850,
                          letterSpacing: '0.12em',
                          color: settings.welcome_background_url ? '#fed7aa' : '#ea580c',
                          textTransform: 'uppercase',
                          display: 'block',
                        }}
                      >
                        FRESHLY MADE FOR YOU
                      </span>
                      <strong
                        style={{
                          fontFamily: 'Georgia, serif',
                          fontSize: '0.78rem',
                          color: settings.welcome_background_url ? '#ffffff' : '#1f1816',
                          display: 'block',
                          lineHeight: 1.15,
                          margin: '0.15rem 0',
                        }}
                      >
                        Welcome to<br />
                        <em style={{ color: settings.welcome_background_url ? '#fed7aa' : '#ea580c' }}>
                          {settings.brand_name || 'KIOSK'}
                        </em>
                      </strong>
                    </div>

                    {/* Mini Food Icon Ring */}
                    <div
                      style={{
                        width: '3.1rem',
                        height: '3.1rem',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.92)',
                        backdropFilter: 'blur(4px)',
                        margin: '0.1rem auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        zIndex: 1,
                      }}
                    >
                      <img
                        src="/menu/burger-bundle.png"
                        alt=""
                        style={{ width: '82%', height: '82%', objectFit: 'contain' }}
                      />
                    </div>

                    {/* Start Order Button */}
                    <div style={{ zIndex: 1, marginBottom: '0.1rem' }}>
                      <span
                        style={{
                          display: 'block',
                          background: '#ea580c',
                          color: '#ffffff',
                          fontSize: '0.54rem',
                          fontWeight: 800,
                          padding: '0.32rem 0.45rem',
                          borderRadius: '0.35rem',
                          boxShadow: '0 2px 6px rgba(234, 88, 12, 0.45)',
                        }}
                      >
                        Start your order &rarr;
                      </span>
                      <small
                        style={{
                          display: 'block',
                          fontSize: '0.42rem',
                          color: settings.welcome_background_url ? '#ffedd5' : '#78716c',
                          marginTop: '0.2rem',
                        }}
                      >
                        Tap screen to begin
                      </small>
                    </div>
                  </div>

                  {/* Kiosk Lower POS Hardware Deck: Receipt Printer Slot & Card Payment Cradle */}
                  <div
                    style={{
                      width: '182px',
                      background: 'linear-gradient(180deg, #292524 0%, #1c1917 100%)',
                      border: '1px solid #44403c',
                      borderTop: '2px solid #0c0a09',
                      borderBottomLeftRadius: '0.65rem',
                      borderBottomRightRadius: '0.65rem',
                      padding: '0.4rem 0.55rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.4rem',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Thermal Receipt Dispenser Mouth */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <div
                        style={{
                          width: '100%',
                          height: '4px',
                          background: '#09090b',
                          borderRadius: '2px',
                          border: '1px solid #44403c',
                          position: 'relative',
                        }}
                      >
                        {/* Realistic Paper Lip */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '2px',
                            left: '6px',
                            right: '6px',
                            height: '4px',
                            background: '#ffffff',
                            borderRadius: '0 0 1px 1px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.38rem', color: '#a8a29e', fontWeight: 700, letterSpacing: '0.04em' }}>
                        RECEIPT DISPENSER
                      </span>
                    </div>

                    {/* Integrated Contactless / Card Reader Bay */}
                    <div
                      style={{
                        background: '#09090b',
                        border: '1px solid #52525b',
                        borderRadius: '0.3rem',
                        padding: '0.15rem 0.35rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1px',
                      }}
                    >
                      <span style={{ fontSize: '0.45rem', lineHeight: 1 }}>💳</span>
                      <span style={{ fontSize: '0.34rem', color: '#38bdf8', fontWeight: 800, letterSpacing: '0.04em' }}>
                        TAP / CARD
                      </span>
                    </div>
                  </div>

                  {/* Kiosk Pedestal Pillar Neck */}
                  <div
                    style={{
                      width: '38px',
                      height: '24px',
                      background: 'linear-gradient(90deg, #44403c 0%, #78716c 50%, #292524 100%)',
                      borderLeft: '1px solid #1c1917',
                      borderRight: '1px solid #1c1917',
                    }}
                  />

                  {/* Heavy-Duty Kiosk Floor Stand Base Plate */}
                  <div
                    style={{
                      width: '95px',
                      height: '8px',
                      background: 'linear-gradient(180deg, #52525b 0%, #18181b 100%)',
                      borderRadius: '4px',
                      border: '1px solid #71717a',
                      boxShadow: '0 6px 14px rgba(0, 0, 0, 0.28)',
                    }}
                  />
                </div>

                <span
                  style={{
                    fontSize: '0.66rem',
                    color: '#78716c',
                    fontWeight: 750,
                    marginTop: '0.65rem',
                    textAlign: 'center',
                  }}
                >
                  Self-Ordering Kiosk Stand (1080 × 1920)
                </span>
              </div>
            </div>
          </section>

          {/* Section 03: Payment Methods */}
          <section className="settings-section">
            <div className="settings-section__intro">
              <span>03</span>
              <div>
                <h3>Payment methods</h3>
                <p>At least one payment method must remain available.</p>
              </div>
            </div>
            <div className="settings-toggles">
              <label>
                <span>
                  <strong>Pay at counter</strong>
                  <small>Allow staff-assisted payment after checkout.</small>
                </span>
                <input
                  type="checkbox"
                  checked={settings.counter_payment_enabled}
                  onChange={(event) =>
                    setSettings({ ...settings, counter_payment_enabled: event.target.checked })
                  }
                />
              </label>
              <label>
                <span>
                  <strong>Card payment</strong>
                  <small>Allow card selection at the kiosk terminal.</small>
                </span>
                <input
                  type="checkbox"
                  checked={settings.card_payment_enabled}
                  onChange={(event) =>
                    setSettings({ ...settings, card_payment_enabled: event.target.checked })
                  }
                />
              </label>
            </div>
          </section>

          {/* Section 04: Kiosk Behavior */}
          <section className="settings-section">
            <div className="settings-section__intro">
              <span>04</span>
              <div>
                <h3>Kiosk behavior</h3>
                <p>Control abandoned sessions and ticket-screen resets.</p>
              </div>
            </div>
            <div className="settings-fields">
              <label className="settings-field">
                Idle timeout (seconds)
                <input
                  type="number"
                  min="30"
                  max="1800"
                  value={settings.idle_timeout_seconds}
                  onChange={(event) =>
                    setSettings({ ...settings, idle_timeout_seconds: Number(event.target.value) })
                  }
                />
              </label>
              <label className="settings-field">
                Ticket reset (seconds)
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={settings.auto_reset_seconds}
                  onChange={(event) =>
                    setSettings({ ...settings, auto_reset_seconds: Number(event.target.value) })
                  }
                />
              </label>
            </div>
          </section>

          {/* Section 05: Receipt Message */}
          <section className="settings-section">
            <div className="settings-section__intro">
              <span>05</span>
              <div>
                <h3>Receipt message</h3>
                <p>Customize the header and footer printed on receipts.</p>
              </div>
            </div>
            <div className="settings-fields settings-fields--receipt">
              <label className="settings-field settings-field--wide">
                Receipt header
                <input
                  value={settings.receipt_header ?? ''}
                  maxLength={120}
                  onChange={(event) =>
                    setSettings({ ...settings, receipt_header: event.target.value || null })
                  }
                />
              </label>
              <label className="settings-field settings-field--wide">
                Receipt footer
                <textarea
                  value={settings.receipt_footer ?? ''}
                  maxLength={240}
                  rows={3}
                  onChange={(event) =>
                    setSettings({ ...settings, receipt_footer: event.target.value || null })
                  }
                />
              </label>
            </div>
          </section>

          {/* Section 06: WBOX POS Connection (Clean, full width, no empty gaps) */}
          <section className="settings-section">
            <div className="settings-section__intro">
              <span>06</span>
              <div>
                <h3>WBOX POS connection</h3>
                <p>Deliver kiosk orders through the local WBOX folders.</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Enable Toggle */}
              <div className="settings-toggles">
                <label>
                  <span>
                    <strong>Enable WBOX delivery</strong>
                    <small>Queue new orders for the local bridge.</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.wbox_enabled}
                    onChange={(event) =>
                      setSettings({ ...settings, wbox_enabled: event.target.checked })
                    }
                  />
                </label>
              </div>

              {/* Folder Paths: Clean full-width fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="settings-field">
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    Request folder
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        style={{ flex: 1 }}
                        value={settings.wbox_request_path ?? ''}
                        placeholder="e.g. C:\WBOX\Request"
                        onChange={(event) =>
                          setSettings({ ...settings, wbox_request_path: event.target.value || null })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => chooseFolder('wbox_request_path')}
                        style={{
                          background: '#fff7ed',
                          border: '1.5px solid #fed7aa',
                          color: '#ea580c',
                          borderRadius: '0.55rem',
                          padding: '0 1rem',
                          minHeight: '2.8rem',
                          fontWeight: 750,
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        📁 Browse folder
                      </button>
                    </div>
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: '#78716c' }}>Quick shortcuts:</span>
                    {['C:\\WBOX\\Request', 'D:\\WBOX\\Request', 'C:\\POS\\Orders\\Request'].map((path) => (
                      <button
                        key={path}
                        type="button"
                        onClick={() => {
                          setSettings({ ...settings, wbox_request_path: path })
                          showToast(`Set Request folder to ${path}`, 'info')
                        }}
                        style={{
                          background: '#fffaf5',
                          border: '1px dashed #fed7aa',
                          borderRadius: '0.35rem',
                          fontSize: '0.62rem',
                          color: '#c2410c',
                          padding: '0.15rem 0.45rem',
                          cursor: 'pointer',
                        }}
                      >
                        {path}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-field">
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    Response folder
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        style={{ flex: 1 }}
                        value={settings.wbox_response_path ?? ''}
                        placeholder="e.g. C:\WBOX\Response"
                        onChange={(event) =>
                          setSettings({ ...settings, wbox_response_path: event.target.value || null })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => chooseFolder('wbox_response_path')}
                        style={{
                          background: '#fff7ed',
                          border: '1.5px solid #fed7aa',
                          color: '#ea580c',
                          borderRadius: '0.55rem',
                          padding: '0 1rem',
                          minHeight: '2.8rem',
                          fontWeight: 750,
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        📁 Browse folder
                      </button>
                    </div>
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: '#78716c' }}>Quick shortcuts:</span>
                    {['C:\\WBOX\\Response', 'D:\\WBOX\\Response', 'C:\\POS\\Orders\\Response'].map((path) => (
                      <button
                        key={path}
                        type="button"
                        onClick={() => {
                          setSettings({ ...settings, wbox_response_path: path })
                          showToast(`Set Response folder to ${path}`, 'info')
                        }}
                        style={{
                          background: '#fffaf5',
                          border: '1px dashed #fed7aa',
                          borderRadius: '0.35rem',
                          fontSize: '0.62rem',
                          color: '#c2410c',
                          padding: '0.15rem 0.45rem',
                          cursor: 'pointer',
                        }}
                      >
                        {path}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2-Column Grid for Credentials & Configuration Parameters */}
              <div className="settings-fields">
                <label className="settings-field">
                  Kiosk number
                  <input
                    value={settings.wbox_kiosk_number}
                    maxLength={32}
                    onChange={(event) =>
                      setSettings({ ...settings, wbox_kiosk_number: event.target.value })
                    }
                  />
                </label>
                <label className="settings-field">
                  WBOX product
                  <input
                    value={settings.wbox_product}
                    maxLength={32}
                    onChange={(event) =>
                      setSettings({ ...settings, wbox_product: event.target.value })
                    }
                  />
                </label>
                <label className="settings-field">
                  Authentication token
                  <input
                    type="password"
                    value={settings.wbox_auth_token}
                    placeholder={
                      settings.wbox_auth_token_configured
                        ? 'Configured - leave blank to keep it'
                        : 'Enter WBOX token'
                    }
                    onChange={(event) =>
                      setSettings({ ...settings, wbox_auth_token: event.target.value })
                    }
                  />
                </label>
                <label className="settings-field">
                  Retry delay (seconds)
                  <input
                    type="number"
                    min="5"
                    max="3600"
                    value={settings.wbox_retry_seconds}
                    onChange={(event) =>
                      setSettings({ ...settings, wbox_retry_seconds: Number(event.target.value) })
                    }
                  />
                </label>
              </div>

              {/* Test Connection Card */}
              <div
                style={{
                  background: '#fff8f5',
                  border: '1px solid #fed7aa',
                  borderRadius: '0.75rem',
                  padding: '1rem 1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.8rem', color: '#1f1816', display: 'block' }}>
                    Connection Diagnostics
                  </strong>
                  <small style={{ color: '#78716c', fontSize: '0.68rem' }}>
                    Validate folder read/write permissions and token credentials.
                  </small>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  {wboxStatus && (
                    <span
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '0.45rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: wboxReady ? '#f0fdf4' : '#fef2f2',
                        color: wboxReady ? '#166534' : '#dc2626',
                        border: `1px solid ${wboxReady ? '#bbf7d0' : '#fecaca'}`,
                      }}
                      role="status"
                    >
                      {wboxStatus}
                    </span>
                  )}
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={checkWbox}
                    disabled={checkingWbox}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {checkingWbox ? 'Checking...' : 'Test saved connection'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom Save Action Bar */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--admin-line)',
              borderRadius: '0.85rem',
              boxShadow: '0 4px 18px #ea580c08',
              padding: '1.2rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              marginTop: '0.5rem',
            }}
          >
            <div>
              <strong style={{ fontSize: '0.88rem', color: 'var(--admin-ink)', display: 'block' }}>
                Save system configuration
              </strong>
              <small style={{ color: 'var(--admin-muted)', fontSize: '0.72rem' }}>
                Changes will be saved and synchronized across your kiosks.
              </small>
            </div>
            <button
              type="submit"
              className="admin-primary"
              style={{ minWidth: '10rem', padding: '0.75rem 1.8rem', fontSize: '0.82rem' }}
              disabled={saving}
            >
              {saving ? 'Saving changes...' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {/* Floating Auto Scroll to Top Button */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
        title="Scroll to top"
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '3.2rem',
          height: '3.2rem',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
          color: '#ffffff',
          border: '1.5px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 8px 24px rgba(234, 88, 12, 0.42), 0 2px 8px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          opacity: showScrollTop ? 1 : 0,
          transform: showScrollTop ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(16px)',
          pointerEvents: showScrollTop ? 'auto' : 'none',
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          fontSize: '1.3rem',
          fontWeight: 800,
        }}
      >
        ↑
      </button>
    </AdminShell>
  )
}
