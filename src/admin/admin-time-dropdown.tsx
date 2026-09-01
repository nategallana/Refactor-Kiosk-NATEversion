import { useState, useEffect, useRef } from 'react'
import {
  AVAILABLE_TIMEZONES,
  getActiveTimezone,
  setActiveTimezone,
  formatPhDate,
  type TimezoneOption,
} from '../domain/datetime'
import { useAdminNotificationsStore } from './admin-notifications-store'

export function AdminTimeDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentTz, setCurrentTz] = useState(getActiveTimezone())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [use24Hour, setUse24Hour] = useState(() => {
    return localStorage.getItem('kiosk_time_format') === '24h'
  })
  const menuRef = useRef<HTMLDivElement>(null)

  // Ticking live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Listen to timezone changes from other components
  useEffect(() => {
    const handleTzChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ timezone: string }>
      if (customEvent.detail?.timezone) {
        setCurrentTz(customEvent.detail.timezone)
      }
    }
    window.addEventListener('kiosk:timezone-changed', handleTzChange)
    return () => window.removeEventListener('kiosk:timezone-changed', handleTzChange)
  }, [])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleSelectTimezone = (tzValue: string) => {
    setCurrentTz(tzValue)
    setActiveTimezone(tzValue)
    const tzObj = AVAILABLE_TIMEZONES.find((t) => t.value === tzValue)
    useAdminNotificationsStore.getState().addNotification({
      title: 'Timezone Updated',
      message: `System clock updated to ${tzObj?.label || tzValue} (${tzObj?.offset || ''}).`,
      category: 'system',
      severity: 'info',
      link: '/admin/settings',
    })
  }

  const toggle24Hour = () => {
    const nextVal = !use24Hour
    setUse24Hour(nextVal)
    localStorage.setItem('kiosk_time_format', nextVal ? '24h' : '12h')
    window.dispatchEvent(new CustomEvent('kiosk:timeformat-changed', { detail: { format: nextVal ? '24h' : '12h' } }))
  }

  const activeOption: TimezoneOption =
    AVAILABLE_TIMEZONES.find((t) => t.value === currentTz) || {
      value: currentTz,
      label: currentTz,
      offset: 'GMT',
      region: 'Custom Region',
    }

  const formattedTime = new Intl.DateTimeFormat('en-PH', {
    timeZone: currentTz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: !use24Hour,
  }).format(currentTime)

  const formattedDate = formatPhDate(currentTime, currentTz)

  return (
    <div className="admin-time-dropdown-wrap" ref={menuRef} style={{ position: 'relative' }}>
      {/* Clock Button in Admin Header */}
      <button
        type="button"
        className="admin-time-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change system time and timezone"
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.55rem',
          padding: '0.45rem 0.85rem',
          background: isOpen ? '#fff1e6' : '#fff8f5',
          border: '1px solid ' + (isOpen ? '#ea580c' : '#fed7aa'),
          borderRadius: '0.65rem',
          color: '#1f1816',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          fontSize: '0.78rem',
          fontWeight: 700,
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '0.95rem' }} aria-hidden="true">
          🕒
        </span>
        <span style={{ fontFamily: 'monospace', letterSpacing: '0.02em', color: '#c2410c' }}>
          {formattedTime}
        </span>
        <span
          style={{
            background: '#ea580c',
            color: '#ffffff',
            fontSize: '0.62rem',
            padding: '0.15rem 0.4rem',
            borderRadius: '0.35rem',
            fontWeight: 800,
            textTransform: 'uppercase',
          }}
        >
          {activeOption.offset}
        </span>
        <span style={{ fontSize: '0.65rem', color: '#78716c', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
          ▼
        </span>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          className="admin-time-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.6rem)',
            right: 0,
            width: '21rem',
            background: '#ffffff',
            border: '1px solid #fed7aa',
            borderRadius: '0.85rem',
            boxShadow: '0 12px 32px #ea580c14, 0 4px 12px #0000000a',
            zIndex: 1000,
            padding: '1.1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem',
            animation: 'toast-pop-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Popover Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0e8e2', paddingBottom: '0.65rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 800, color: '#ea580c', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                SYSTEM CLOCK
              </p>
              <h4 style={{ margin: '0.15rem 0 0', fontSize: '0.92rem', color: '#1f1816', fontWeight: 750 }}>
                Timezone & Time Settings
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 0,
                fontSize: '1.1rem',
                color: '#a89e98',
                cursor: 'pointer',
                padding: '0.2rem',
              }}
            >
              &times;
            </button>
          </div>

          {/* Current Live Preview Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
              border: '1px solid #fed7aa',
              borderRadius: '0.65rem',
              padding: '0.85rem',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '0.65rem', color: '#78716c', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
              {activeOption.region}
            </span>
            <div style={{ fontFamily: 'monospace', fontSize: '1.45rem', fontWeight: 800, color: '#c2410c', margin: '0.2rem 0' }}>
              {formattedTime}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#574d49', fontWeight: 650 }}>
              📅 {formattedDate}
            </div>
          </div>

          {/* Timezone Selector Dropdown */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.72rem',
                fontWeight: 750,
                color: '#574d49',
                marginBottom: '0.35rem',
              }}
            >
              Select Timezone
            </label>
            <select
              value={currentTz}
              onChange={(e) => handleSelectTimezone(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: '0.55rem',
                border: '1.5px solid #fed7aa',
                background: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 650,
                color: '#1f1816',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {AVAILABLE_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} ({tz.offset})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Presets */}
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#78716c', marginBottom: '0.35rem' }}>
              Quick Presets:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {[
                { name: '🇵🇭 Manila (GMT+8)', val: 'Asia/Manila' },
                { name: '🇸🇬 Singapore (GMT+8)', val: 'Asia/Singapore' },
                { name: '🇯🇵 Tokyo (GMT+9)', val: 'Asia/Tokyo' },
                { name: '🇺🇸 New York (EST)', val: 'America/New_York' },
                { name: '🌐 UTC', val: 'UTC' },
              ].map((p) => {
                const isSelected = currentTz === p.val
                return (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => handleSelectTimezone(p.val)}
                    style={{
                      padding: '0.3rem 0.55rem',
                      borderRadius: '0.45rem',
                      border: '1px solid ' + (isSelected ? '#ea580c' : '#fed7aa'),
                      background: isSelected ? '#ea580c' : '#fff8f5',
                      color: isSelected ? '#ffffff' : '#c2410c',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {p.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 12h vs 24h Toggle Switch */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '0.6rem',
              borderTop: '1px solid #f0e8e2',
            }}
          >
            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1f1816', display: 'block' }}>
                24-Hour Format
              </span>
              <small style={{ fontSize: '0.62rem', color: '#78716c' }}>
                {use24Hour ? 'Military / 24-hour time' : 'Standard 12-hour AM/PM'}
              </small>
            </div>
            <button
              type="button"
              onClick={toggle24Hour}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.45rem',
                border: '1px solid #fed7aa',
                background: use24Hour ? '#ea580c' : '#f0e8e2',
                color: use24Hour ? '#ffffff' : '#574d49',
                fontSize: '0.7rem',
                fontWeight: 750,
                cursor: 'pointer',
              }}
            >
              {use24Hour ? '24-Hour ON' : '12-Hour ON'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}