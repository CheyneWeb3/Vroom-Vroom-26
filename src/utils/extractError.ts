export function extractErrorMessage(error: any): string {
  const candidates = [
    error?.shortMessage,
    error?.reason,
    error?.error?.reason,
    error?.error?.message,
    error?.error?.data?.message,
    error?.error?.data?.originalError?.message,
    error?.info?.error?.message,
    error?.info?.error?.data?.message,
    error?.info?.payload?.method
      ? `RPC ${error.info.payload.method}: ${error?.info?.error?.message || 'Unknown provider error'}`
      : null,
    error?.message
  ].filter(Boolean)

  const message = candidates[0] || 'Transaction failed'

  if (typeof message !== 'string') {
    try {
      return JSON.stringify(message)
    } catch {
      return 'Transaction failed'
    }
  }

  return message
}
