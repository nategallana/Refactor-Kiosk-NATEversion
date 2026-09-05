/**
 * ESC/POS Thermal Receipt Command Generator
 * Standard binary and formatted text printer output for 80mm / 58mm POS receipt printers.
 */
export interface EscPosReceiptData {
  orderNumber: string
  diningType: string
  createdAt: string
  items: Array<{
    name: string
    quantity: number
    priceMinor: number
    selections?: string[]
  }>
  subtotalMinor: number
  taxMinor: number
  totalMinor: number
  paymentMethod: string
  brandName?: string
  receiptHeader?: string | null
  receiptFooter?: string | null
  kioskNumber?: string
}

export function generateEscPosCommands(data: EscPosReceiptData): Uint8Array {
  const encoder = new TextEncoder()
  const bytes: number[] = []

  const writeText = (str: string) => {
    const encoded = encoder.encode(str)
    for (const b of encoded) {
      bytes.push(b)
    }
  }

  // ESC @ - Initialize printer
  bytes.push(0x1B, 0x40)

  // ESC a 1 - Center alignment
  bytes.push(0x1B, 0x61, 0x01)

  // Brand Name
  const brand = data.brandName || 'FAST FOOD KIOSK'
  // GS ! 0x11 - Double width & Double height
  bytes.push(0x1D, 0x21, 0x11)
  writeText(`${brand}\n`)

  // Reset text formatting
  bytes.push(0x1D, 0x21, 0x00)

  if (data.receiptHeader) {
    writeText(`${data.receiptHeader}\n`)
  }

  writeText('------------------------------------------\n')

  // Order Number in bold double height
  writeText('ORDER NUMBER\n')
  bytes.push(0x1D, 0x21, 0x11)
  writeText(`#${data.orderNumber}\n`)
  bytes.push(0x1D, 0x21, 0x00)

  writeText(`${data.diningType.toUpperCase()}  |  ${data.createdAt}\n`)
  if (data.kioskNumber) writeText(`Terminal: ${data.kioskNumber}\n`)
  writeText('==========================================\n')

  // ESC a 0 - Left alignment
  bytes.push(0x1B, 0x61, 0x00)

  // Item lines
  data.items.forEach((item) => {
    const qty = `${item.quantity}x`
    const name = item.name.slice(0, 24).padEnd(24, ' ')
    const price = `PHP ${(item.priceMinor / 100).toFixed(2)}`.padStart(12, ' ')
    writeText(`${qty.padEnd(4, ' ')}${name}${price}\n`)

    if (item.selections && item.selections.length > 0) {
      writeText(`    ${item.selections.join(' | ')}\n`)
    }
  })

  writeText('------------------------------------------\n')

  // Totals
  const formatRow = (label: string, value: number) => {
    const p = `PHP ${(value / 100).toFixed(2)}`
    return `${label.padEnd(28, ' ')}${p.padStart(14, ' ')}\n`
  }

  writeText(formatRow('Subtotal:', data.subtotalMinor))
  writeText(formatRow('VAT (12%):', data.taxMinor))

  // GS ! 0x01 - Bold / Double height Total
  bytes.push(0x1D, 0x21, 0x01)
  writeText(formatRow('GRAND TOTAL:', data.totalMinor))
  bytes.push(0x1D, 0x21, 0x00)

  writeText('==========================================\n')

  // ESC a 1 - Center footer
  bytes.push(0x1B, 0x61, 0x01)
  writeText(`Payment Method: ${data.paymentMethod.toUpperCase()}\n`)
  if (data.receiptFooter) {
    writeText(`${data.receiptFooter}\n`)
  } else {
    writeText('Thank you for ordering with us!\nPlease present this slip at the claim counter.\n')
  }

  // Feed lines & Paper Cut (GS V 66 0)
  bytes.push(0x1B, 0x64, 0x04)
  bytes.push(0x1D, 0x56, 0x42, 0x00)

  return new Uint8Array(bytes)
}

/**
 * Triggers direct thermal printing via browser print dialog with @media print CSS optimization
 */
export function printReceiptDocument() {
  window.print()
}
