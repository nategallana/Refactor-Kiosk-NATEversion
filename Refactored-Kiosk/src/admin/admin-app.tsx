import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLogin } from './admin-login'
import { AdminGuard, CatalogPage, DashboardPage, OrdersPage, PlaceholderPage } from './admin-pages'
import './admin.css'

const protect = (element: React.ReactNode) => <AdminGuard>{element}</AdminGuard>

export function AdminApp() {
  return <BrowserRouter><Routes>
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin" element={protect(<DashboardPage />)} />
    <Route path="/admin/catalog" element={protect(<CatalogPage />)} />
    <Route path="/admin/orders" element={protect(<OrdersPage />)} />
    <Route path="/admin/kiosks" element={protect(<PlaceholderPage section="kiosks" />)} />
    <Route path="/admin/reports" element={protect(<PlaceholderPage section="reports" />)} />
    <Route path="/admin/settings" element={protect(<PlaceholderPage section="settings" />)} />
    <Route path="*" element={<Navigate to="/admin" replace />} />
  </Routes></BrowserRouter>
}
