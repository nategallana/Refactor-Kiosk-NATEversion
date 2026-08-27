import { calculateTotals, selectedUnitPrice } from './order'
import type { Product } from './catalog'

describe('order pricing', () => {
  it('uses integer minor units for selections and quantities', () => {
    const product = { basePrice: 19900 } as Product
    expect(selectedUnitPrice(product, [{ groupId: 'g', groupName: 'Size', valueId: 'v', valueName: 'Large', priceDelta: 4500 }])).toBe(24400)
  })

  it('calculates rounded VAT and totals', () => {
    expect(calculateTotals([{ id: '1', productId: 'p', sku: 'SKU', name: 'Meal', unitPrice: 19900, quantity: 2, selections: [], note: '' }])).toEqual({ subtotal: 39800, tax: 4776, total: 44576 })
  })
})
