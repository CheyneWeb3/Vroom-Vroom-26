import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'

type Props = {
  title: string
  subtitle: string
  chips?: string[]
  children: React.ReactNode
  warning?: string | null
}

export function Page({ title, subtitle, chips, children, warning }: Props) {
  return (
    <Stack spacing={3}>
      <Box>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ md: 'center' }}
        >
          <Box>
            <Typography variant="h4" fontWeight={900}>{title}</Typography>
            <Typography variant="body1" color="text.secondary">{subtitle}</Typography>
          </Box>

          {chips && chips.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {chips.map((chip) => <Chip key={chip} label={chip} />)}
            </Stack>
          )}
        </Stack>
      </Box>

      {warning ? <Alert severity="warning">{warning}</Alert> : null}

      <Card>
        <CardContent>{children}</CardContent>
      </Card>
    </Stack>
  )
}
