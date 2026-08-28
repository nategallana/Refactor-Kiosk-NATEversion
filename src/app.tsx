import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { IdleGuard } from './components/idle-guard'
import { TerminalSetup } from './components/terminal-setup'
import { MaintenanceScreen } from './components/maintenance-screen'
import { WelcomeScreen } from './screens/welcome'
import { DiningScreen } from './screens/dining'
import { MenuScreen } from './screens/menu'
import { ProductScreen } from './screens/product'
import { CartScreen } from './screens/cart'
import { PaymentScreen } from './screens/payment'
import { TicketScreen } from './screens/ticket'
import { useKioskStore } from './store/kiosk-store'
import { useTerminalStore } from './store/terminal-store'
import { useHeartbeat } from './hooks/use-heartbeat'

export function App() {
  const fetchSettings = useKioskStore((state) => state.fetchSettings)
  const registered = useTerminalStore((s) => s.registered)
  const terminalStatus = useTerminalStore((s) => s.status)

  useEffect(() => {
    if (!registered) return
    void fetchSettings()
  }, [fetchSettings, registered])

  useHeartbeat()

  if (!registered) return <TerminalSetup />
  if (terminalStatus === 'maintenance') return <MaintenanceScreen />

  return <BrowserRouter><IdleGuard /><Routes>
    <Route path="/" element={<WelcomeScreen />} />
    <Route path="/dining" element={<DiningScreen />} />
    <Route path="/menu" element={<MenuScreen />} />
    <Route path="/products/:id" element={<ProductScreen />} />
    <Route path="/cart" element={<CartScreen />} />
    <Route path="/payment" element={<PaymentScreen />} />
    <Route path="/ticket" element={<TicketScreen />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter>
}
