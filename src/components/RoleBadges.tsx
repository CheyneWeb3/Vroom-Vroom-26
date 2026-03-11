import { Chip, Stack } from '@mui/material'
import type { RoleMap } from '../types'

export function RoleBadges({ roles }: { roles: RoleMap }) {
  const items = [
    roles.admin && 'Admin',
    roles.registrar && 'Registrar',
    roles.manufacturer && 'Manufacturer',
    roles.dealer && 'Dealer',
    roles.regulator && 'Regulator'
  ].filter(Boolean) as string[]

  if (!items.length) return <Chip label="No elevated roles" variant="outlined" />

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {items.map((item) => <Chip key={item} label={item} color="primary" />)}
    </Stack>
  )
}
