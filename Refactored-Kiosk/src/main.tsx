import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AdminApp } from './admin/admin-app'
import { App } from './app'
import './styles.css'

const root = window.location.pathname.startsWith('/admin') ? <AdminApp /> : <App />
createRoot(document.getElementById('root')!).render(<StrictMode>{root}</StrictMode>)
