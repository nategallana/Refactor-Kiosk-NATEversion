import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Product } from '../domain/catalog'
import { catalogRepository } from '../data/catalog'
import { formatMoney, selectedUnitPrice, type CartSelection } from '../domain/order'
import { ArrowLeft } from '../components/icons'
import { useKioskStore } from '../store/kiosk-store'

export function ProductScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const addItem = useKioskStore((state) => state.addItem)
  const [product, setProduct] = useState<Product | null>(null)
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    catalogRepository.getProduct(id, controller.signal).then((item) => {
      if (!item) return
      setProduct(item)
      setSelected(Object.fromEntries(item.optionGroups.map((group) => [group.id, group.required && group.values[0] ? [group.values[0].id] : []])))
    }).catch(() => undefined)
    return () => controller.abort()
  }, [id])
  const selections = useMemo<CartSelection[]>(() => product?.optionGroups.flatMap((group) => (selected[group.id] ?? []).flatMap((valueId) => {
    const value = group.values.find((item) => item.id === valueId)
    return value ? [{ groupId: group.id, groupName: group.name, valueId: value.id, valueName: value.name, priceDelta: value.priceDelta }] : []
  })) ?? [], [product, selected])
  const valid = product?.optionGroups.every((group) => (selected[group.id]?.length ?? 0) >= group.minSelections) ?? false
  const unitPrice = product ? selectedUnitPrice(product, selections) : 0
  const toggle = (groupId: string, valueId: string, max: number) => setSelected((state) => {
    const current = state[groupId] ?? []
    if (max === 1) return { ...state, [groupId]: [valueId] }
    return { ...state, [groupId]: current.includes(valueId) ? current.filter((id) => id !== valueId) : current.length < max ? [...current, valueId] : current }
  })
  if (!product) return <div className="state-card standalone-state">Loading item…</div>
  return <main className="product-detail screen-enter">
    <section className="product-hero" style={{ background: product.accent }}><button className="icon-button icon-button--light" onClick={() => navigate('/menu')} aria-label="Back to menu"><ArrowLeft /></button><span className="product-hero__emoji">{product.emoji}</span><span className="product-hero__sku">{product.sku}</span></section>
    <section className="customizer">
      <div className="customizer__heading"><p className="eyebrow">MAKE IT YOURS</p><h1>{product.name}</h1><p>{product.description}</p></div>
      {product.optionGroups.map((group) => <fieldset className="option-group" key={group.id}><legend>{group.name}<small>{group.required ? 'Required' : `Choose up to ${group.maxSelections}`}</small></legend><div className="option-list">{group.values.map((value) => { const active = selected[group.id]?.includes(value.id); return <button type="button" className={active ? 'option-row active' : 'option-row'} key={value.id} onClick={() => toggle(group.id, value.id, group.maxSelections)}><span className="radio-mark">{active ? '✓' : ''}</span><strong>{value.name}</strong><span>{value.priceDelta ? `+${formatMoney(value.priceDelta)}` : 'Included'}</span></button> })}</div></fieldset>)}
      <label className="note-field"><span>Special request <small>Optional</small></span><input maxLength={80} value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. sauce on the side" /></label>
      <div className="add-bar"><div className="quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">−</button><strong>{quantity}</strong><button onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity">+</button></div><button className="primary-button add-button" disabled={!valid || !product.available} onClick={() => { addItem({ id: crypto.randomUUID(), productId: product.id, sku: product.sku, name: product.name, unitPrice, quantity, selections, note }); navigate('/menu') }}><span>Add to order</span><strong>{formatMoney(unitPrice * quantity)}</strong></button></div>
    </section>
  </main>
}
