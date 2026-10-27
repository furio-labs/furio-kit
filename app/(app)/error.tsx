'use client'
import { useEffect } from 'react'
import { errorTracker } from '@/shared/observability'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    errorTracker.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-danger">{error.message ?? 'Something went wrong.'}</p>
      <button
        type="button"
        onClick={reset}
        className="text-sm text-primary underline hover:text-primary-hover"
      >
        Try again
      </button>
    </div>
  )
}
