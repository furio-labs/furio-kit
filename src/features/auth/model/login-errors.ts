// Login errors travel as fixed codes in the URL (?error=<code>) so the form
// works without client JavaScript. Only known codes map to text; arbitrary
// query values are never rendered.
export const LOGIN_ERRORS = {
  invalid_email: 'Invalid email address',
  password_too_short: 'Password must be at least 8 characters',
  invalid_input: 'Please check your email and password',
  not_configured: 'Authentication not configured. Connect an auth adapter.',
} as const

export type LoginErrorCode = keyof typeof LOGIN_ERRORS

const FALLBACK_MESSAGE = 'Sign-in failed. Please try again.'

export function isLoginErrorCode(value: unknown): value is LoginErrorCode {
  return typeof value === 'string' && Object.hasOwn(LOGIN_ERRORS, value)
}

export function getLoginErrorMessage(code: unknown): string | undefined {
  if (code === undefined || code === null || code === '') return undefined
  return isLoginErrorCode(code) ? LOGIN_ERRORS[code] : FALLBACK_MESSAGE
}

/**
 * Accepts only same-origin relative paths ("/reports?tab=1"). Rejects absolute
 * URLs, protocol-relative ("//host") and backslash tricks ("/\host") to
 * prevent open redirects after login.
 */
export function safeReturnTo(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return undefined
  return value
}
