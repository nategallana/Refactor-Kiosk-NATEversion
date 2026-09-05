import { z } from 'zod'

export const optionValueSchema = z.object({
  id: z.string(),
  name: z.string(),
  priceDelta: z.number().int(),
  imageUrl: z.string().optional(),
  emoji: z.string().optional(),
})

export const optionGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  required: z.boolean(),
  minSelections: z.number().int().nonnegative(),
  maxSelections: z.number().int().positive(),
  values: z.array(optionValueSchema),
})

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  displayOrder: z.number().int(),
  active: z.boolean(),
})

export const productSchema = z.object({
  id: z.string(),
  sku: z.string(),
  categoryId: z.string(),
  name: z.string(),
  description: z.string(),
  basePrice: z.number().int().nonnegative(),
  active: z.boolean(),
  available: z.boolean(),
  accent: z.string(),
  emoji: z.string(),
  imageUrl: z.string().optional(),
  combo: z.boolean().optional(),
  optionGroups: z.array(optionGroupSchema),
})

export const catalogSchema = z.object({
  categories: z.array(categorySchema),
  products: z.array(productSchema),
})

export type OptionValue = z.infer<typeof optionValueSchema>
export type OptionGroup = z.infer<typeof optionGroupSchema>
export type Category = z.infer<typeof categorySchema>
export type Product = z.infer<typeof productSchema>
export type Catalog = z.infer<typeof catalogSchema>

export interface CatalogRepository {
  getCatalog(signal?: AbortSignal): Promise<Catalog>
  getProduct(id: string, signal?: AbortSignal): Promise<Product | undefined>
}
