import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AdminLogin } from './admin-login'
import { AdminGuard, CatalogPage, DashboardPage, OrdersPage } from './admin-pages'
import { KiosksPage } from './admin-kiosks'
import { ReportsPage } from './admin-reports'
import { SettingsPage } from './admin-settings'
import './admin.css'

import { PlatformGuard, PlatformLayout } from '../platform/platform-layout'
import {
  OverviewPage,
  StoresPage,
  UsersPage,
  TerminalsPage,
  WboxPage,
  ReportsPage as PlatformReportsPage,
  AuditLogPage,
  SecurityPage,
} from '../platform/platform-pages'

const protect = (element: React.ReactNode) => <AdminGuard>{element}</AdminGuard>
const platformProtect = (element: React.ReactNode) => (
  <PlatformGuard>
    <PlatformLayout>{element}</PlatformLayout>
  </PlatformGuard>
)

function AdminSessionListener() {
  const navigate = useNavigate()
  useEffect(() => {
    const expired = () => navigate('/admin/login?expired=1', { replace: true })
    window.addEventListener('admin:session-expired', expired)
    return () => window.removeEventListener('admin:session-expired', expired)
  }, [navigate])
  return null
}

export function AdminApp() {
  return <BrowserRouter><AdminSessionListener /><Routes>
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin" element={protect(<DashboardPage />)} />
    <Route path="/admin/catalog" element={protect(<CatalogPage />)} />
    <Route path="/admin/orders" element={protect(<OrdersPage />)} />
    <Route path="/admin/kiosks" element={protect(<KiosksPage />)} />
    <Route path="/admin/reports" element={protect(<ReportsPage />)} />
    <Route path="/admin/settings" element={protect(<SettingsPage />)} />

    {/* Super Admin Platform Routes */}
    <Route path="/platform" element={platformProtect(<OverviewPage />)} />
    <Route path="/platform/stores" element={platformProtect(<StoresPage />)} />
    <Route path="/platform/stores/:id" element={platformProtect(<StoresPage />)} />
    <Route path="/platform/users" element={platformProtect(<UsersPage />)} />
    <Route path="/platform/terminals" element={platformProtect(<TerminalsPage />)} />
    <Route path="/platform/wbox" element={platformProtect(<WboxPage />)} />
    <Route path="/platform/reports" element={platformProtect(<PlatformReportsPage />)} />
    <Route path="/platform/audit" element={platformProtect(<AuditLogPage />)} />
    <Route path="/platform/security" element={platformProtect(<SecurityPage />)} />

    <Route path="*" element={<Navigate to="/admin" replace />} />
  </Routes></BrowserRouter>
}
