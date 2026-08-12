import { useKioskStore } from './kiosk-store'

describe('kiosk store', () => {
  beforeEach(() => useKioskStore.getState().reset())

  it('adds and removes persisted cart items', () => {
    const item = { id: 'line-1', productId: 'p1', sku: 'SKU-1', name: 'Meal', unitPrice: 10000, quantity: 1, selections: [], note: '' }
    useKioskStore.getState().addItem(item)
    expect(useKioskStore.getState().items).toHaveLength(1)
    useKioskStore.getState().updateQuantity(item.id, 0)
    expect(useKioskStore.getState().items).toHaveLength(0)
  })
})
