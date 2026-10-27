import { Button } from '@/shared/ui'
import { loginAction } from '../actions/login-action'
import { getLoginErrorMessage, safeReturnTo } from '../model/login-errors'

type SearchParams = Record<string, string | string[] | undefined>

export interface LoginFormProps {
  /** The login page's `searchParams`; carries `?error=<code>` and `?returnTo=`. */
  searchParams?: Promise<SearchParams>
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Server Component: a plain `<form action={serverAction}>` that submits before
 * client JavaScript loads (progressive enhancement). Validation errors come back
 * as an `?error=` code on the redirect to /login.
 */
export async function LoginForm({ searchParams }: LoginFormProps) {
  const params = (await searchParams) ?? {}
  const error = getLoginErrorMessage(first(params.error))
  const returnTo = safeReturnTo(first(params.returnTo))

  return (
    <form action={loginAction} className="mx-auto mt-16 w-full max-w-sm space-y-4 px-4">
      <h1 className="text-2xl font-bold text-foreground">Sign in</h1>

      {error && (
        <p role="alert" className="rounded-control border border-danger px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <Button type="submit">Sign in</Button>
    </form>
  )
}
