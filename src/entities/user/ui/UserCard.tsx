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
        {/* Avatar uses semantic tokens from app/globals.css, so a kit swap restyles it. */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary-hover text-lg font-semibold text-foreground">
          {user.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{user.name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
            {user.role}
          </span>
        </div>
      </div>
    </Card>
  )
}
