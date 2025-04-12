import * as z from 'zod'

// 宠物销售状态

export const StatusSchema = z.enum([
  'available',
  'pending',
  'sold',
])
export type Status = z.infer<typeof StatusSchema>

export const TagSchema = z.object({
  id: z.union([z.number(), z.null()]).optional(),
  name: z.union([z.null(), z.string()]).optional(),
})
export type Tag = z.infer<typeof TagSchema>

export const CategorySchema = z.object({
  id: z.union([z.number(), z.null()]).optional(),
  name: z.union([z.null(), z.string()]).optional(),
})
export type Category = z.infer<typeof CategorySchema>

export const PetSchema = z.object({
  category: CategorySchema,
  id: z.number(),
  name: z.string(),
  photoUrls: z.array(z.string()),
  status: StatusSchema,
  tags: z.array(TagSchema),
})
export type Pet = z.infer<typeof PetSchema>
