import { Grid, Stack, Typography } from '@mui/material'
import { Page } from '../components/Page'
import { TitleCard } from '../components/TitleCard'
import type { OwnedTitle } from '../types'

export function MyTitlesPage({ titles }: { titles: OwnedTitle[] }) {
  return (
    <Page title="My Titles" subtitle="Titles currently held by the connected wallet account.">
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Because the contract is not enumerable, this view is assembled from transfer events tied to the connected address.
        </Typography>

        <Grid container spacing={2}>
          {titles.length ? (
            titles.map((title) => (
              <Grid key={title.tokenId.toString()} size={{ xs: 12, md: 6, xl: 4 }}>
                <TitleCard title={title} />
              </Grid>
            ))
          ) : (
            <Grid size={12}>
              <Typography color="text.secondary">No owned titles found.</Typography>
            </Grid>
          )}
        </Grid>
      </Stack>
    </Page>
  )
}
