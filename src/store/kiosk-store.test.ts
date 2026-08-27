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

  it('reuses a checkout key until the cart changes or resets', () => {
    const item = { id: 'line-1', productId: 'p1', sku: 'SKU-1', name: 'Meal', unitPrice: 10000, quantity: 1, selections: [], note: '' }
    useKioskStore.getState().addItem(item)

    const firstKey = useKioskStore.getState().getCheckoutIdempotencyKey('same-request')
    const retryKey = useKioskStore.getState().getCheckoutIdempotencyKey('same-request')
    expect(retryKey).toBe(firstKey)

    useKioskStore.getState().updateQuantity(item.id, 2)
    expect(useKioskStore.getState().checkoutAttempt).toBeNull()
    useKioskStore.getState().reset()
    expect(useKioskStore.getState().checkoutAttempt).toBeNull()
  })

  it('groups duplicate cart items with identical options and note', () => {
    const item1 = { id: 'line-1', productId: 'p1', sku: 'SKU-1', name: 'Meal', unitPrice: 10000, quantity: 1, selections: [{ groupId: 'size', groupName: 'Size', valueId: 'regular', valueName: 'Regular', priceDelta: 0 }], note: 'No ice' }
    const item2 = { id: 'line-2', productId: 'p1', sku: 'SKU-1', name: 'Meal', unitPrice: 10000, quantity: 2, selections: [{ groupId: 'size', groupName: 'Size', valueId: 'regular', valueName: 'Regular', priceDelta: 0 }], note: 'No ice' }
    useKioskStore.getState().addItem(item1)
    useKioskStore.getState().addItem(item2)
    expect(useKioskStore.getState().items).toHaveLength(1)
    expect(useKioskStore.getState().items[0]?.quantity).toBe(3)
  })
})
