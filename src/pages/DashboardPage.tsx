import { Alert, Grid, Stack, Typography } from '@mui/material'
import { Page } from '../components/Page'
import { RoleBadges } from '../components/RoleBadges'
import { TitleCard } from '../components/TitleCard'
import type { OwnedTitle, RoleMap } from '../types'

export function DashboardPage({
  roles,
  ownedTitles,
  recentTitles,
  wrongNetwork,
  onSwitchNetwork
}: {
  roles: RoleMap
  ownedTitles: OwnedTitle[]
  recentTitles: OwnedTitle[]
  wrongNetwork: boolean
  onSwitchNetwork: () => void
}) {
  return (
    <Page
      title="Dashboard"
      subtitle="Overview of your title records, roles, and recent activity in the registry."
      chips={[`${ownedTitles.length} titles in wallet`, `${recentTitles.length} recent minted records`]}
      warning={wrongNetwork ? 'You are connected to the wrong network. Switch back to Avalanche Fuji to use the app correctly.' : null}
    >
      <Stack spacing={3}>
        {wrongNetwork ? (
          <Alert severity="warning">
            Network mismatch detected. <button onClick={onSwitchNetwork}>Switch</button>
          </Alert>
        ) : null}

        <Stack spacing={1}>
          <Typography variant="h6">Current access</Typography>
          <RoleBadges roles={roles} />
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="h6">My titles</Typography>
          <Grid container spacing={2}>
            {ownedTitles.length ? (
              ownedTitles.slice(0, 4).map((title) => (
                <Grid key={title.tokenId.toString()} size={{ xs: 12, md: 6 }}>
                  <TitleCard title={title} />
                </Grid>
              ))
            ) : (
              <Grid size={12}>
                <Typography color="text.secondary">No titles found for the connected wallet yet.</Typography>
              </Grid>
            )}
          </Grid>
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="h6">Recently minted</Typography>
          <Grid container spacing={2}>
            {recentTitles.length ? (
              recentTitles.map((title) => (
                <Grid key={title.tokenId.toString()} size={{ xs: 12, md: 6 }}>
                  <TitleCard title={title} />
                </Grid>
              ))
            ) : (
              <Grid size={12}>
                <Typography color="text.secondary">No recent title mint events found.</Typography>
              </Grid>
            )}
          </Grid>
        </Stack>
      </Stack>
    </Page>
  )
}
