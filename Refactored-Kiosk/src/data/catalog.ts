import { catalogSchema, type Catalog, type CatalogRepository } from '../domain/catalog'

const size = {
  id: 'size', name: 'Size', required: true, minSelections: 1, maxSelections: 1,
  values: [
    { id: 'regular', name: 'Regular', priceDelta: 0 },
    { id: 'large', name: 'Large', priceDelta: 4500 },
  ],
}

const extras = {
  id: 'extras', name: 'Make it yours', required: false, minSelections: 0, maxSelections: 3,
  values: [
    { id: 'cheese', name: 'Extra cheese', priceDelta: 2500 },
    { id: 'egg', name: 'Sunny egg', priceDelta: 3000 },
    { id: 'bacon', name: 'Crispy bacon', priceDelta: 4500 },
  ],
}

const drink = {
  id: 'drink', name: 'Choose a drink', required: true, minSelections: 1, maxSelections: 1,
  values: [
    { id: 'iced-tea', name: 'House iced tea', priceDelta: 0 },
    { id: 'lemonade', name: 'Fresh lemonade', priceDelta: 1500 },
    { id: 'cola', name: 'Classic cola', priceDelta: 0 },
  ],
}

const fixture: Catalog = catalogSchema.parse({
  categories: [
    { id: 'featured', name: 'Featured', displayOrder: 1, active: true },
    { id: 'meals', name: 'Meals', displayOrder: 2, active: true },
    { id: 'handhelds', name: 'Handhelds', displayOrder: 3, active: true },
    { id: 'sides', name: 'Sides', displayOrder: 4, active: true },
    { id: 'drinks', name: 'Drinks', displayOrder: 5, active: true },
  ],
  products: [
    { id: 'p1', sku: 'MEAL-001', categoryId: 'featured', name: 'Crispy Chicken Plate', description: 'Golden chicken, garlic rice, garden slaw, and house gravy.', basePrice: 24900, active: true, available: true, accent: '#efc767', emoji: '🍗', optionGroups: [size, drink, extras] },
    { id: 'p2', sku: 'BRG-001', categoryId: 'featured', name: 'The House Burger', description: 'Smashed beef, cheddar, pickles, onion, and secret sauce.', basePrice: 21900, active: true, available: true, accent: '#df8f65', emoji: '🍔', optionGroups: [size, extras] },
    { id: 'p3', sku: 'MEAL-002', categoryId: 'meals', name: 'Pepper Beef Rice', description: 'Tender beef, pepper sauce, steamed rice, and scallions.', basePrice: 23900, active: true, available: true, accent: '#9fc4a8', emoji: '🍛', optionGroups: [size, drink] },
    { id: 'p4', sku: 'WRAP-001', categoryId: 'handhelds', name: 'Garden Crunch Wrap', description: 'Roasted vegetables, herbed rice, lettuce, and yogurt sauce.', basePrice: 18900, active: true, available: true, accent: '#b3cf77', emoji: '🌯', optionGroups: [size, extras] },
    { id: 'p5', sku: 'SIDE-001', categoryId: 'sides', name: 'Sea Salt Fries', description: 'Skin-on fries with sea salt and roasted garlic dip.', basePrice: 9900, active: true, available: true, accent: '#f2d789', emoji: '🍟', optionGroups: [size] },
    { id: 'p6', sku: 'DRK-001', categoryId: 'drinks', name: 'Citrus Cooler', description: 'Lemon, orange, mint, and sparkling water over ice.', basePrice: 8900, active: true, available: true, accent: '#f3aa72', emoji: '🍊', optionGroups: [size] },
    { id: 'p7', sku: 'DRK-002', categoryId: 'drinks', name: 'Cold Brew Cloud', description: 'Slow-steeped coffee with vanilla cream.', basePrice: 11900, active: true, available: false, accent: '#b99c83', emoji: '🥤', optionGroups: [size] },
  ],
})

const delay = (signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = window.setTimeout(resolve, 180)
  signal?.addEventListener('abort', () => {
    window.clearTimeout(timer)
    reject(new DOMException('Aborted', 'AbortError'))
  })
})

export class FixtureCatalogRepository implements CatalogRepository {
  async getCatalog(signal?: AbortSignal) {
    await delay(signal)
    return catalogSchema.parse(fixture)
  }

  async getProduct(id: string, signal?: AbortSignal) {
    await delay(signal)
    const product = fixture.products.find((item) => item.id === id)
    return product ? catalogSchema.shape.products.element.parse(product) : undefined
  }
}

export const catalogRepository = new FixtureCatalogRepository()
