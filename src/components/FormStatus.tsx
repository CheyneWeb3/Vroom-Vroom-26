import { Alert, CircularProgress, Stack } from '@mui/material'

export function FormStatus({
  loading,
  error,
  success
}: {
  loading: boolean
  error: string | null
  success: string | null
}) {
  return (
    <Stack spacing={1}>
      {loading ? <CircularProgress size={20} /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
    </Stack>
  )
}
