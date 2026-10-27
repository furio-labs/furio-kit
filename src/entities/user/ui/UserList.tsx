import { connection } from 'next/server'
import { getUsers } from '../api/get-users'
import { UserCard } from './UserCard'

// Async Server Component — owns its own data fetch so it can be wrapped
// in <Suspense> by the parent for granular streaming.
export async function UserList() {
  // Request-time data: never prerender at build, where API_URL may be unset
  // (CI) and the result would be baked into static HTML.
  await connection()
  const users = await getUsers()

  return (
    <ul className="flex flex-col gap-4">
      {users.map((user) => (
        <li key={user.id}>
          <UserCard user={user} />
        </li>
      ))}
    </ul>
  )
}
