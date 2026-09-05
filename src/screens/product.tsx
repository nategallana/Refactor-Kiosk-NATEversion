import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Product } from '../domain/catalog'
import { catalogRepository } from '../data/catalog'
import { formatMoney, selectedUnitPrice, type CartSelection } from '../domain/order'
import { ArrowLeft } from '../components/icons'
import { useKioskStore } from '../store/kiosk-store'
import { sounds } from '../domain/sound'

const buildSelections = (product: Product, selected: Record<string, string[]>): CartSelection[] =>
  product.optionGroups.flatMap((group) => (selected[group.id] ?? []).flatMap((valueId) => {
    const value = group.values.find((item) => item.id === valueId)
    return value ? [{
      groupId: group.id,
      groupName: group.name,
      valueId: value.id,
      valueName: value.name,
      priceDelta: value.priceDelta,
    }] : []
  }))

export function ProductScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const addItem = useKioskStore((state) => state.addItem)
  const [product, setProduct] = useState<Product | null>(null)
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [comboStep, setComboStep] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    catalogRepository.getProduct(id, controller.signal).then((item) => {
      if (!item) return
      setProduct(item)
      setComboStep(0)
      setSelected(item.combo
        ? Object.fromEntries(item.optionGroups.map((group) => [group.id, []]))
        : Object.fromEntries(item.optionGroups.map((group) => [group.id, group.required && group.values[0] ? [group.values[0].id] : []])))
    }).catch(() => undefined)
    return () => controller.abort()
  }, [id])

  const selections = useMemo(
    () => product ? buildSelections(product, selected) : [],
    [product, selected],
  )
  const valid = product?.optionGroups.every((group) => (selected[group.id]?.length ?? 0) >= group.minSelections) ?? false
  const unitPrice = product ? selectedUnitPrice(product, selections) : 0

  const toggle = (groupId: string, valueId: string, max: number) => setSelected((state) => {
    const current = state[groupId] ?? []
    if (max === 1) return { ...state, [groupId]: [valueId] }
    return {
      ...state,
      [groupId]: current.includes(valueId)
        ? current.filter((selectedId) => selectedId !== valueId)
        : current.length < max ? [...current, valueId] : current,
    }
  })

  if (!product) return <div className="state-card standalone-state">Loading item&hellip;</div>

  const addConfiguredItem = (nextSelected = selected, itemQuantity = quantity, itemNote = note) => {
    const nextSelections = buildSelections(product, nextSelected)
    const nextUnitPrice = selectedUnitPrice(product, nextSelections)
    addItem({
      id: crypto.randomUUID(),
      productId: product.id,
      sku: product.sku,
      name: product.name,
      unitPrice: nextUnitPrice,
      quantity: itemQuantity,
      selections: nextSelections,
      note: itemNote,
    })
    sounds.playAddToCart()
    navigate('/menu')
  }

  if (product.combo) {
    const group = product.optionGroups[comboStep]
    if (!group) return <div className="state-card standalone-state">This combo is not available right now.</div>

    const chooseComboValue = (valueId: string) => {
      sounds.playTap()
      const nextSelected = { ...selected, [group.id]: [valueId] }
      setSelected(nextSelected)
      if (comboStep < product.optionGroups.length - 1) {
        setComboStep((step) => step + 1)
      } else {
        addConfiguredItem(nextSelected, 1, '')
      }
    }

    return <main className="combo-builder screen-enter">
      <header className="combo-builder__header"><h1>{product.name}</h1></header>
      <ol className="combo-progress" aria-label={'Step ' + (comboStep + 1) + ' of ' + product.optionGroups.length}>
        {product.optionGroups.map((optionGroup, index) => <li
          key={optionGroup.id}
          className={index <= comboStep ? 'active' : ''}
          aria-current={index === comboStep ? 'step' : undefined}
        ><span>{index + 1}</span></li>)}
      </ol>
      <section className="combo-builder__content">
        <h2>Choose your <em>{group.name.toLowerCase()}</em></h2>
        <div className="combo-options">
          {group.values.map((value) => <button key={value.id} onClick={() => chooseComboValue(value.id)}>
            <span className="combo-option__art">
              {value.imageUrl ? <img src={value.imageUrl} alt="" /> : <span>{value.emoji ?? product.emoji}</span>}
            </span>
            <strong>{value.name}</strong>
            {value.priceDelta > 0 && <small>+{formatMoney(value.priceDelta)}</small>}
          </button>)}
        </div>
      </section>
      <button className="combo-cancel" onClick={() => navigate('/menu')}>Cancel</button>
    </main>
  }

  return <main className="product-detail screen-enter">
    <section className="product-hero" style={{ background: product.accent }}>
      <button className="icon-button icon-button--light" onClick={() => navigate('/menu')} aria-label="Back to menu"><ArrowLeft /></button>
      {product.imageUrl ? <img className="product-hero__image" src={product.imageUrl} alt="" /> : <span className="product-hero__emoji">{product.emoji}</span>}
      <span className="product-hero__sku">{product.sku}</span>
    </section>
    <section className="customizer">
      <div className="customizer__heading"><p className="eyebrow">MAKE IT YOURS</p><h1>{product.name}</h1><p>{product.description}</p></div>
      {product.optionGroups.map((group) => <fieldset className="option-group" key={group.id}>
        <legend>{group.name}<small>{group.required ? 'Required' : 'Choose up to ' + group.maxSelections}</small></legend>
        <div className="option-list">{group.values.map((value) => {
          const active = selected[group.id]?.includes(value.id)
          return <button type="button" className={active ? 'option-row active' : 'option-row'} key={value.id} onClick={() => toggle(group.id, value.id, group.maxSelections)}>
            <span className="radio-mark">{active ? '✓' : ''}</span>
            <strong>{value.name}</strong>
            <span>{value.priceDelta ? '+' + formatMoney(value.priceDelta) : 'Included'}</span>
          </button>
        })}</div>
      </fieldset>)}
      <label className="note-field"><span>Special request <small>Optional</small></span><input maxLength={80} value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. sauce on the side" /></label>
      <div className="add-bar">
        <div className="quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">&minus;</button><strong>{quantity}</strong><button onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity">+</button></div>
        <button className="primary-button add-button" disabled={!valid || !product.available} onClick={() => addConfiguredItem()}>
          <span>Add to order</span><strong>{formatMoney(unitPrice * quantity)}</strong>
        </button>
      </div>
    </section>
  </main>
}
