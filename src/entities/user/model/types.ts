import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
  avatarUrl: z.string().url().optional(),
})

export type User = z.infer<typeof UserSchema>
