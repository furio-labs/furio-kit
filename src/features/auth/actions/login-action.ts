'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { type LoginErrorCode, safeReturnTo } from '../model/login-errors'

const LoginSchema = z.object({
  email: z.email({ error: 'invalid_email' satisfies LoginErrorCode }),
  password: z.string({ error: 'invalid_input' satisfies LoginErrorCode }).min(8, {
    error: 'password_too_short' satisfies LoginErrorCode,
  }),
})

function redirectWithError(code: LoginErrorCode, returnTo: string | undefined): never {
  const params = new URLSearchParams({ error: code })
  if (returnTo) params.set('returnTo', returnTo)
  redirect(`/login?${params}`)
}

/**
 * Server Action bound directly to `<form action>`: works before (or without)
 * client JavaScript. Errors are reported by redirecting back to /login with an
 * `?error=<code>` search param; success redirects to `returnTo`.
 *
 * Implementation notes:
 *   1. Call your identity provider to exchange credentials for a token.
 *   2. Set the token in an HttpOnly, Secure, SameSite=Strict cookie via `cookies()`.
 *   3. Never store tokens in localStorage or return them to the client.
 *
 * Example (uncomment and adapt):
 *
 *   import { cookies } from 'next/headers'
 *   const token = await identityProvider.authenticate(email, password)
 *   ;(await cookies()).set('session', token, {
 *     httpOnly: true,
 *     secure: process.env.NODE_ENV === 'production',
 *     sameSite: 'strict',
 *     maxAge: 60 * 60 * 8, // 8 hours
 *     path: '/',
 *   })
 *   redirect(returnTo ?? '/')
 */
export async function loginAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formData.get('returnTo'))

  const result = LoginSchema.safeParse({
    email: formData.get('email') ?? undefined,
    password: formData.get('password') ?? undefined,
  })
  if (!result.success) {
    const message = result.error.issues[0]?.message
    const code: LoginErrorCode =
      message === 'invalid_email' || message === 'password_too_short' ? message : 'invalid_input'
    redirectWithError(code, returnTo)
  }

  const { email: _email, password: _password } = result.data

  // TODO: Replace with real authentication (see notes above), then
  // redirect(returnTo ?? '/') on success.
  redirectWithError('not_configured', returnTo)
}
