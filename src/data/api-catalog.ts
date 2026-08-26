import { catalogSchema, type CatalogRepository, type Product } from '../domain/catalog'

const apiBase = (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_API_BASE ?? '/api/v1'

interface RawCategory {
  id: number
  name: string
  display_order: number
  active: number | boolean
}

interface RawOptionValue {
  id: string
  name: string
  priceDelta: number
  imageUrl?: string
  emoji?: string
}

interface RawOptionGroup {
  id: string
  name: string
  required: boolean
  minSelections: number
  maxSelections: number
  values: RawOptionValue[]
}

interface RawProduct {
  id: number
  category_id: number
  sku: string
  name: string
  description: string | null
  price_minor: number
  option_groups: RawOptionGroup[]
  emoji: string | null
  accent: string
  active: number | boolean
  available: number | boolean
  combo: number | boolean
  image_url: string | null
}

function mapCatalog(raw: { categories: RawCategory[]; products: RawProduct[] }) {
  return catalogSchema.parse({
    categories: raw.categories.map((c) => ({
      id: String(c.id),
      name: c.name,
      displayOrder: c.display_order,
      active: Boolean(c.active),
    })),
    products: raw.products.map((p) => ({
      id: String(p.id),
      sku: p.sku,
      categoryId: String(p.category_id),
      name: p.name,
      description: p.description ?? '',
      basePrice: p.price_minor,
      active: Boolean(p.active),
      available: Boolean(p.available),
      accent: p.accent,
      emoji: p.emoji ?? '',
      imageUrl: p.image_url ?? undefined,
      combo: Boolean(p.combo),
      optionGroups: p.option_groups ?? [],
    })),
  })
}

export class ApiCatalogRepository implements CatalogRepository {
  private cache: ReturnType<typeof mapCatalog> | null = null

  async getCatalog(signal?: AbortSignal) {
    const response = await fetch(`${apiBase}/catalog`, { signal, headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Catalog fetch failed: ${response.status}`)
    const raw = await response.json()
    this.cache = mapCatalog(raw)
    return this.cache
  }

  async getProduct(id: string, signal?: AbortSignal): Promise<Product | undefined> {
    if (!this.cache) await this.getCatalog(signal)
    return this.cache?.products.find((p) => p.id === id)
  }
}
