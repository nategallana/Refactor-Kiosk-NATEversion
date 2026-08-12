import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AdminLogin } from './admin-login'
import { AdminGuard, CatalogPage, DashboardPage, OrdersPage, PlaceholderPage } from './admin-pages'
import { SettingsPage } from './admin-settings'
import './admin.css'

const protect = (element: React.ReactNode) => <AdminGuard>{element}</AdminGuard>

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
    <Route path="/admin/kiosks" element={protect(<PlaceholderPage section="kiosks" />)} />
    <Route path="/admin/reports" element={protect(<PlaceholderPage section="reports" />)} />
    <Route path="/admin/settings" element={protect(<SettingsPage />)} />
    <Route path="*" element={<Navigate to="/admin" replace />} />
  </Routes></BrowserRouter>
}
