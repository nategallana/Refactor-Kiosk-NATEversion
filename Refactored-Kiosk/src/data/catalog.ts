import { catalogSchema, type Catalog, type CatalogRepository } from '../domain/catalog'

const size = {
  id: 'size', name: 'Size', required: true, minSelections: 1, maxSelections: 1,
  values: [
    { id: 'regular', name: 'Regular', priceDelta: 0 },
    { id: 'large', name: 'Large', priceDelta: 4500 },
  ],
}

const extras = {
  id: 'extras', name: 'Extras', required: false, minSelections: 0, maxSelections: 3,
  values: [
    { id: 'cheese', name: 'Extra cheese', priceDelta: 2500 },
    { id: 'egg', name: 'Sunny egg', priceDelta: 3000 },
    { id: 'bacon', name: 'Crispy bacon', priceDelta: 4500 },
  ],
}

const drink = {
  id: 'drink', name: 'Drink choice', required: true, minSelections: 1, maxSelections: 1,
  values: [
    { id: 'iced-tea', name: 'House iced tea', priceDelta: 0, imageUrl: '/menu/drink.png' },
    { id: 'lemonade', name: 'Fresh lemonade', priceDelta: 1500, imageUrl: '/menu/drink.png' },
  ],
}

const burgerChoice = {
  id: 'burger-choice', name: 'Burger choice', required: true, minSelections: 1, maxSelections: 1,
  values: [
    { id: 'zinger', name: 'Zinger burger with cheese', priceDelta: 0, imageUrl: '/menu/cheeseburger.png' },
    { id: 'bacon-burger', name: 'Bacon Burger', priceDelta: 2000, imageUrl: '/menu/bacon-burger.png' },
  ],
}

const comboSide = {
  id: 'side-choice', name: 'Side choice', required: true, minSelections: 1, maxSelections: 1,
  values: [
    { id: 'fries', name: 'Golden fries', priceDelta: 0, imageUrl: '/menu/fries.png' },
    { id: 'spaghetti', name: 'Classic spaghetti', priceDelta: 2500, imageUrl: '/menu/spaghetti.png' },
  ],
}

const fixture: Catalog = catalogSchema.parse({
  categories: [
    { id: 'featured', name: 'Main', displayOrder: 1, active: true },
    { id: 'burgers', name: 'Burgers', displayOrder: 2, active: true },
    { id: 'combos', name: 'Combo Meals', displayOrder: 3, active: true },
    { id: 'meals', name: 'Meals', displayOrder: 4, active: true },
    { id: 'sides', name: 'Sides', displayOrder: 5, active: true },
    { id: 'drinks', name: 'Drinks', displayOrder: 6, active: true },
    { id: 'desserts', name: 'Desserts', displayOrder: 7, active: true },
  ],
  products: [
    { id: 'combo-burger', sku: 'CMB-001', categoryId: 'combos', name: 'Burger Menu Combo', description: 'Build your burger meal in two easy steps.', basePrice: 25900, active: true, available: true, accent: '#fff4ed', emoji: '🍔', imageUrl: '/menu/burger-bundle.png', combo: true, optionGroups: [burgerChoice, comboSide] },
    { id: 'p1', sku: 'MEAL-001', categoryId: 'meals', name: 'Crispy Chicken Plate', description: 'Golden chicken, garlic rice, garden slaw, and house gravy.', basePrice: 24900, active: true, available: true, accent: '#fff5e9', emoji: '🍗', imageUrl: '/menu/chicken-rice.png', optionGroups: [size, drink, extras] },
    { id: 'p2', sku: 'BRG-001', categoryId: 'burgers', name: 'The House Burger', description: 'Smashed beef, cheddar, pickles, onion, and secret sauce.', basePrice: 21900, active: true, available: true, accent: '#fff3e9', emoji: '🍔', imageUrl: '/menu/cheeseburger.png', optionGroups: [size, extras] },
    { id: 'p3', sku: 'MEAL-002', categoryId: 'meals', name: 'Chicken Rice Bowl', description: 'Crispy chicken served with steamed rice and house gravy.', basePrice: 23900, active: true, available: true, accent: '#f7f5eb', emoji: '🍛', imageUrl: '/menu/chicken-rice.png', optionGroups: [size, drink] },
    { id: 'p4', sku: 'PASTA-001', categoryId: 'meals', name: 'Chicken Spaghetti', description: 'Sweet-style spaghetti topped with a crispy chicken piece.', basePrice: 18900, active: true, available: true, accent: '#fff4eb', emoji: '🍝', imageUrl: '/menu/chicken-spaghetti.png', optionGroups: [size, extras] },
    { id: 'p5', sku: 'SIDE-001', categoryId: 'sides', name: 'Golden Fries', description: 'Crisp golden fries seasoned with sea salt.', basePrice: 9900, active: true, available: true, accent: '#fff8df', emoji: '🍟', imageUrl: '/menu/fries.png', optionGroups: [size] },
    { id: 'p6', sku: 'DRK-001', categoryId: 'drinks', name: 'Citrus Cooler', description: 'A bright citrus drink served cold over ice.', basePrice: 8900, active: true, available: true, accent: '#fff6df', emoji: '🍹', imageUrl: '/menu/drink.png', optionGroups: [size] },
    { id: 'p7', sku: 'DSR-001', categoryId: 'desserts', name: 'Creamy Sundae', description: 'Soft serve finished with a rich chocolate swirl.', basePrice: 7900, active: true, available: true, accent: '#fff4f1', emoji: '🍦', imageUrl: '/menu/dessert.png', optionGroups: [size] },
    { id: 'p8', sku: 'BRG-002', categoryId: 'burgers', name: 'Big Burger', description: 'A hearty double-stack burger with our signature sauce.', basePrice: 22900, active: true, available: true, accent: '#fff2e8', emoji: '🍔', imageUrl: '/menu/big-burger.png', optionGroups: [size, extras] },
    { id: 'p9', sku: 'BRG-003', categoryId: 'burgers', name: 'Double Cheese Burger', description: 'Two beef patties layered with melted cheese.', basePrice: 23900, active: true, available: true, accent: '#fff5e9', emoji: '🍔', imageUrl: '/menu/double-burger.png', optionGroups: [size, extras] },
    { id: 'p10', sku: 'PASTA-002', categoryId: 'meals', name: 'Classic Spaghetti', description: 'Comforting sweet-style spaghetti with grated cheese.', basePrice: 14900, active: true, available: true, accent: '#fff4ed', emoji: '🍝', imageUrl: '/menu/spaghetti.png', optionGroups: [size] },
    { id: 'p11', sku: 'SND-001', categoryId: 'featured', name: 'Chicken Sandwich', description: 'Crispy chicken, lettuce, and creamy dressing in a soft bun.', basePrice: 17900, active: true, available: true, accent: '#f7f6ec', emoji: '🥪', imageUrl: '/menu/chicken-sandwich.png', optionGroups: [size, extras] },
    { id: 'p12', sku: 'BRG-004', categoryId: 'burgers', name: 'Bacon Burger', description: 'A juicy beef burger finished with crisp smoky bacon.', basePrice: 22900, active: true, available: false, accent: '#fff2e8', emoji: '🍔', imageUrl: '/menu/bacon-burger.png', optionGroups: [size, extras] },
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
