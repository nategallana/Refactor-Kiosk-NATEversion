import { describe, it, expect } from 'vitest'
import { generateEscPosCommands, type EscPosReceiptData } from './escpos'

describe('ESC/POS Thermal Receipt Generator', () => {
  const sampleData: EscPosReceiptData = {
    orderNumber: '0042',
    diningType: 'dine-in',
    createdAt: '2026-09-02T10:00:00Z',
    items: [
      {
        name: 'Crispy Chicken Burger',
        quantity: 2,
        priceMinor: 24000,
        selections: ['Extra Cheese', 'Large Fries'],
      },
      {
        name: 'Iced Tea',
        quantity: 2,
        priceMinor: 8000,
      },
    ],
    subtotalMinor: 32000,
    taxMinor: 3840,
    totalMinor: 32000,
    paymentMethod: 'card',
    brandName: 'BURGER & CO',
    receiptHeader: 'Welcome to Store #01',
    receiptFooter: 'Visit us again soon!',
    kioskNumber: 'KIOSK-01',
  }

  it('generates non-empty binary ESC/POS byte sequence', () => {
    const bytes = generateEscPosCommands(sampleData)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
  })

  it('includes hardware initialization and cut commands', () => {
    const bytes = generateEscPosCommands(sampleData)
    // ESC @ (0x1B, 0x40)
    expect(bytes[0]).toBe(0x1B)
    expect(bytes[1]).toBe(0x40)

    // Paper Cut (GS V 66 0 -> 0x1D, 0x56, 0x42, 0x00) at the end
    const len = bytes.length
    expect(bytes[len - 4]).toBe(0x1D)
    expect(bytes[len - 3]).toBe(0x56)
    expect(bytes[len - 2]).toBe(0x42)
    expect(bytes[len - 1]).toBe(0x00)
  })

  it('contains order number and item details encoded in text', () => {
    const bytes = generateEscPosCommands(sampleData)
    const decoded = new TextDecoder().decode(bytes)

    expect(decoded).toContain('BURGER & CO')
    expect(decoded).toContain('#0042')
    expect(decoded).toContain('Crispy Chicken Burger')
    expect(decoded).toContain('Extra Cheese | Large Fries')
    expect(decoded).toContain('Iced Tea')
    expect(decoded).toContain('GRAND TOTAL:')
    expect(decoded).toContain('CARD')
    expect(decoded).toContain('Visit us again soon!')
  })
})
