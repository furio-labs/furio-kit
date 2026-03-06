'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-red-600">{error.message ?? 'Something went wrong.'}</p>
      <button
        type="button"
        onClick={reset}
        className="text-sm text-blue-600 underline hover:text-blue-800"
      >
        Try again
      </button>
    </div>
  )
}
