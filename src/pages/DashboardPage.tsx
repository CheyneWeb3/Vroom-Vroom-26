import { Alert, Grid, Stack, Typography, Card, CardContent } from '@mui/material'
import { Page } from '../components/Page'
import { RoleBadges } from '../components/RoleBadges'
import { VinLookupBox } from '../components/VinLookupBox'
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
      subtitle="Registry overview, role access, and VIN search."
      chips={[
        `${ownedTitles.length} wallet-linked records`,
        `${recentTitles.length} indexed recent records`
      ]}
      warning={wrongNetwork ? 'You are connected to the wrong network. Switch back to Avalanche Fuji to use the app correctly.' : null}
    >
      <Stack spacing={3}>
        {wrongNetwork ? (
          <Alert severity="warning">
            Network mismatch detected. <button onClick={onSwitchNetwork}>Switch</button>
          </Alert>
        ) : null}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="h6">Current access</Typography>
                  <RoleBadges roles={roles} />
                  <Typography variant="body2" color="text.secondary">
                    Sensitive registry listings are not shown on the dashboard. Use VIN search or QR scan for controlled record access.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Card>
              <CardContent>
                <VinLookupBox
                  title="VIN Lookup"
                  subtitle="Search by VIN or scan the VIN QR code to open the matching vehicle record."
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Page>
  )
}
