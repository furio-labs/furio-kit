import 'client-only'

// Client-side auth entry point. Import from Client Components only; it carries
// no adapter or server code. Real enforcement lives in `@/shared/auth/server`.
export { usePermission } from './use-permission'
