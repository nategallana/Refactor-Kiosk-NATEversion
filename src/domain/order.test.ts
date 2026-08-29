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
  it('correctly converts raw database UTC timestamps to Philippines local time', () => {
    // 05:59:00 UTC = 13:59:00 (1:59 PM) in Asia/Manila (UTC+8)
    const rawSqlUtc = '2026-08-29 05:59:00'
    expect(formatPhTime(rawSqlUtc)).toBe('01:59 PM')
    expect(getPhHour(rawSqlUtc)).toBe(13)
    expect(formatPhDate(rawSqlUtc)).toBe('Aug 29, 2026')
  })

  it('handles ISO timestamps with Z or offset', () => {
    const isoWithZ = '2026-08-29T05:59:00.000Z'
    expect(formatPhTime(isoWithZ)).toBe('01:59 PM')
  })

  it('safely parses Date objects', () => {
    const date = new Date('2026-08-29T05:59:00.000Z')
    expect(formatPhTime(date)).toBe('01:59 PM')
  })
})
