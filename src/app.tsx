import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { IdleGuard } from './components/idle-guard'
import { WelcomeScreen } from './screens/welcome'
import { DiningScreen } from './screens/dining'
import { MenuScreen } from './screens/menu'
import { ProductScreen } from './screens/product'
import { CartScreen } from './screens/cart'
import { PaymentScreen } from './screens/payment'
import { TicketScreen } from './screens/ticket'
import { MaintenanceScreen } from './screens/maintenance'
import { useKioskStore, checkIsTerminalMaintenance } from './store/kiosk-store'

export function App() {
  const fetchSettings = useKioskStore((state) => state.fetchSettings)
  const isMaintenance = useKioskStore((state) => state.isMaintenance)
  const setMaintenance = useKioskStore((state) => state.setMaintenance)
  const terminalId = useKioskStore((state) => state.terminalId)

  useEffect(() => {
    fetchSettings()

    const syncStatus = () => {
      setMaintenance(checkIsTerminalMaintenance(terminalId))
    }

    window.addEventListener('kiosk:terminal-status-changed', syncStatus)
    window.addEventListener('storage', syncStatus)

    return () => {
      window.removeEventListener('kiosk:terminal-status-changed', syncStatus)
      window.removeEventListener('storage', syncStatus)
    }
  }, [fetchSettings, setMaintenance, terminalId])

  if (isMaintenance) {
    return <MaintenanceScreen />
  }

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
