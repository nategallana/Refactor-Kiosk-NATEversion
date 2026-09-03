import { calculateTotals, selectedUnitPrice } from './order'
import { formatPhTime, formatPhDate, getPhHour } from './datetime'
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

describe('philippines datetime conversion', () => {
  it('correctly converts raw database timestamps to Philippines local time', () => {
    // Database stores timestamps in Asia/Manila (UTC+8), e.g. 15:34:00 (3:34 PM)
    const rawSqlManila = '2026-09-02 15:34:00'
    expect(formatPhTime(rawSqlManila)).toBe('03:34 PM')
    expect(getPhHour(rawSqlManila)).toBe(15)
    expect(formatPhDate(rawSqlManila)).toBe('Sep 2, 2026')
  })

  it('handles ISO timestamps with Z or offset', () => {
    const isoWithZ = '2026-09-02T07:34:00.000Z'
    expect(formatPhTime(isoWithZ)).toBe('03:34 PM')
  })

  it('safely parses Date objects', () => {
    const date = new Date('2026-09-02T07:34:00.000Z')
    expect(formatPhTime(date)).toBe('03:34 PM')
  })
})
