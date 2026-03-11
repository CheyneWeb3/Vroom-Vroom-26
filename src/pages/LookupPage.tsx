import { Stack, Typography } from '@mui/material'
import { Page } from '../components/Page'
import { VinLookupBox } from '../components/VinLookupBox'

export function LookupPage() {
  return (
    <Page
      title="VIN Lookup"
      subtitle="Check whether a VIN is already registered and open the matching title record."
    >
      <Stack spacing={2}>
        <VinLookupBox
          title="VIN Search"
          subtitle="Enter the VIN manually or scan the VIN QR code to open the registered vehicle record."
        />

        <Typography variant="body2" color="text.secondary">
          The contract enforces VIN uniqueness on-chain, so this page is also the fastest way to check duplication before digitising a legacy record.
        </Typography>
      </Stack>
    </Page>
  )
}
