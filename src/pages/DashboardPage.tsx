import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { Page } from '../components/Page'
import { RoleBadges } from '../components/RoleBadges'
import { VinLookupBox } from '../components/VinLookupBox'
import type { OwnedTitle, RoleMap } from '../types'

function DashboardPanel({
  title,
  subtitle,
  children
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Card
      sx={{
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.08)',
        bgcolor: 'rgba(255,255,255,0.02)',
        boxShadow: 'none',
        height: '100%'
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>

          {children}
        </Stack>
      </CardContent>
    </Card>
  )
}

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
      subtitle="Vehicle registry access, VIN search, and controlled record entry."
      warning={
        wrongNetwork
          ? 'You are connected to the wrong network. Switch back to Avalanche Fuji to use the app correctly.'
          : null
      }
    >
      <Stack spacing={3}>
        {wrongNetwork ? (
          <Alert severity="warning">
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
            >
              <Typography variant="body2">
                Network mismatch detected. Switch back to Avalanche Fuji to continue using the registry.
              </Typography>
              <Button variant="outlined" size="small" onClick={onSwitchNetwork}>
                Switch Network
              </Button>
            </Stack>
          </Alert>
        ) : null}

        <DashboardPanel
          title="Vehicle Title Registry"
          subtitle="Use VIN lookup or QR scan to locate a specific vehicle record. Sensitive listings are intentionally not shown on the dashboard."
        >
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <VinLookupBox
                title="VIN Lookup"
                subtitle="Enter the VIN manually or scan the VIN QR code to open the matching vehicle record."
              />
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800}>
                    Current Access
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Connected role permissions for this wallet.
                  </Typography>
                </Box>

                <RoleBadges roles={roles} />

                <Divider />

                <Stack spacing={1}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Privacy-first dashboard
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Wallet-linked title listings and recent registry activity are intentionally withheld from this screen.
                  </Typography>
                </Stack>

                <Stack spacing={1}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Registry scope
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Indexed wallet records: {ownedTitles.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Indexed recent records: {recentTitles.length}
                  </Typography>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </DashboardPanel>
      </Stack>
    </Page>
  )
}
