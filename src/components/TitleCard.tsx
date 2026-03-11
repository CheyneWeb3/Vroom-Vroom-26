import { Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import type { OwnedTitle } from '../types'
import { formatBigint, recordStateLabel, titleBrandLabel } from '../utils/format'

export function TitleCard({ title }: { title: OwnedTitle }) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
            <Typography variant="h6" fontWeight={800}>
              {title.record.year.toString()} {title.record.make} {title.record.model}
            </Typography>
            <Chip label={`Token #${title.tokenId.toString()}`} />
          </Stack>

          <Typography color="text.secondary">VIN: {title.record.vin}</Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={titleBrandLabel(title.record.brand)} size="small" />
            <Chip label={recordStateLabel(title.record.state)} size="small" variant="outlined" />
            <Chip label={`${formatBigint(title.record.mileage)} mi`} size="small" variant="outlined" />
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {title.record.legacyDigitized ? 'Legacy digitised title' : 'Manufacturer-origin title'}
            </Typography>
            <Button component={RouterLink} to={`/titles/${title.tokenId.toString()}`} variant="contained">
              Open
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
