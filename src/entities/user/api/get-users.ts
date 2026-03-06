import { z } from 'zod'
import { UserSchema } from '../model/types'

const UsersResponseSchema = z.array(UserSchema)

export async function getUsers() {
  // Replace with fetch() or a DB query when the backend is available.
  // The Zod parse below must remain — it validates and narrows the response
  // at the system boundary before any data reaches the UI.
  const raw = [
    { id: '1', name: 'Alex Rivera', email: 'alex@example.com', role: 'admin' },
    { id: '2', name: 'Sam Okoro', email: 'sam@example.com', role: 'member' },
    { id: '3', name: 'Jamie Chen', email: 'jamie@example.com', role: 'viewer' },
  ]

  return UsersResponseSchema.parse(raw)
}
