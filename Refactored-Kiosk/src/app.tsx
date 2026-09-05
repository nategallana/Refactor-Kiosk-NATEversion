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
import { useKioskStore } from './store/kiosk-store'

export function App() {
  const fetchSettings = useKioskStore((state) => state.fetchSettings)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

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
