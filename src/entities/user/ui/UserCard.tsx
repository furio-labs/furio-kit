import { Card } from '@/shared/ui'
import type { User } from '../model/types'

interface UserCardProps {
  user: User
}

// Server Component — purely presentational.
export function UserCard({ user }: UserCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        {/* Avatar: bg/text classes should be replaced with @org/ui-kit token classes. */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-700">
          {user.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{user.name}</p>
          <p className="truncate text-sm text-gray-500">{user.email}</p>
          <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">
            {user.role}
          </span>
        </div>
      </div>
    </Card>
  )
}
