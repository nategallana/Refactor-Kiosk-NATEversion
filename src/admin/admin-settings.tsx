import { useEffect, useState, type FormEvent } from 'react'
import { getSettings, updateSettings, type AdminSettings } from './admin-api'
import { AdminShell } from './admin-shell'
import { useAdminStore } from './admin-store'

type EditableSettings = Omit<AdminSettings, 'id' | 'created_at' | 'updated_at'>
const editable = ({ id: _id, created_at: _createdAt, updated_at: _updatedAt, ...values }: AdminSettings) => {
  void _id; void _createdAt; void _updatedAt
  return values
}

export function SettingsPage() {
  const token = useAdminStore((state) => state.token)!
  const [settings, setSettings] = useState<EditableSettings | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSettings(token).then(({ settings: loaded }) => setSettings(editable(loaded))).catch((reason: Error) => setError(reason.message))
  }, [token])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!settings) return
    setSaving(true); setError(''); setSaved('')
    try {
      const result = await updateSettings(token, settings)
      setSettings(editable(result.settings))
      setSaved('Settings saved successfully.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return <AdminShell title="Settings" eyebrow="CONFIGURATION">
    {!settings && !error && <div className="admin-state">Loading settings...</div>}
    {error && !settings && <div className="admin-error">{error}</div>}
    {settings && <form className="settings-form" onSubmit={save}>
      <div className="settings-form__heading"><div><h2>System configuration</h2><p>Changes apply to registered kiosks after their next configuration refresh.</p></div><button className="admin-primary admin-primary--small" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button></div>
      {error && <div className="admin-error" role="alert">{error}</div>}
      {saved && <div className="admin-success" role="status">{saved}</div>}

      <section className="settings-section">
        <div className="settings-section__intro"><span>01</span><div><h3>Business details</h3><p>Branding and service defaults shown across the ordering experience.</p></div></div>
        <div className="settings-fields">
          <label className="settings-field settings-field--wide">Business name<input value={settings.brand_name} maxLength={80} required onChange={(event) => setSettings({ ...settings, brand_name: event.target.value })} /></label>
          <label className="settings-field">Service mode<select value={settings.service_mode} onChange={(event) => setSettings({ ...settings, service_mode: event.target.value as EditableSettings['service_mode'] })}><option value="both">Dine in and takeout</option><option value="dine-in">Dine in only</option><option value="takeout">Takeout only</option></select></label>
          <label className="settings-field">Tax rate (%)<input type="number" min="0" max="100" step="0.01" value={settings.tax_rate_basis_points / 100} onChange={(event) => setSettings({ ...settings, tax_rate_basis_points: Math.round(Number(event.target.value) * 100) })} /></label>
          <label className="settings-field">Currency<input value={settings.currency} disabled /></label>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__intro"><span>02</span><div><h3>Payment methods</h3><p>At least one payment method must remain available.</p></div></div>
        <div className="settings-toggles">
          <label><span><strong>Pay at counter</strong><small>Allow staff-assisted payment after checkout.</small></span><input type="checkbox" checked={settings.counter_payment_enabled} onChange={(event) => setSettings({ ...settings, counter_payment_enabled: event.target.checked })} /></label>
          <label><span><strong>Card payment</strong><small>Allow card selection at the kiosk terminal.</small></span><input type="checkbox" checked={settings.card_payment_enabled} onChange={(event) => setSettings({ ...settings, card_payment_enabled: event.target.checked })} /></label>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__intro"><span>03</span><div><h3>Kiosk behavior</h3><p>Control abandoned sessions and ticket-screen resets.</p></div></div>
        <div className="settings-fields">
          <label className="settings-field">Idle timeout (seconds)<input type="number" min="30" max="1800" value={settings.idle_timeout_seconds} onChange={(event) => setSettings({ ...settings, idle_timeout_seconds: Number(event.target.value) })} /></label>
          <label className="settings-field">Ticket reset (seconds)<input type="number" min="5" max="300" value={settings.auto_reset_seconds} onChange={(event) => setSettings({ ...settings, auto_reset_seconds: Number(event.target.value) })} /></label>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__intro"><span>04</span><div><h3>Receipt message</h3><p>Customize the header and footer printed on receipts.</p></div></div>
        <div className="settings-fields settings-fields--receipt">
          <label className="settings-field settings-field--wide">Receipt header<input value={settings.receipt_header ?? ''} maxLength={120} onChange={(event) => setSettings({ ...settings, receipt_header: event.target.value || null })} /></label>
          <label className="settings-field settings-field--wide">Receipt footer<textarea value={settings.receipt_footer ?? ''} maxLength={240} rows={3} onChange={(event) => setSettings({ ...settings, receipt_footer: event.target.value || null })} /></label>
        </div>
      </section>
    </form>}
  </AdminShell>
}
