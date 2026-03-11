import {
  Alert,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Chip
} from '@mui/material'
import { useMemo, useState } from 'react'
import { Page } from '../components/Page'
import { FormStatus } from '../components/FormStatus'
import { getReadContract, getWriteContract, readTitle, simulateWrite } from '../lib/contract'
import { extractErrorMessage } from '../utils/extractError'
import type { OwnedTitle } from '../types'
import { formatBigint, recordStateLabel, titleBrandLabel, shortAddress } from '../utils/format'

const steps = ['Lookup VIN', 'Review Record', 'Transfer Ownership']

export function TransferTitlePage({
  walletProvider,
  connected
}: {
  walletProvider?: unknown
  connected: boolean
}) {
  const [step, setStep] = useState(0)
  const [vin, setVin] = useState('')
  const [title, setTitle] = useState<OwnedTitle | null>(null)
  const [newHolder, setNewHolder] = useState('')
  const [holderNote, setHolderNote] = useState('')
  const [paymentToken, setPaymentToken] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const canTransfer = useMemo(() => {
    return Boolean(title && newHolder.trim())
  }, [title, newHolder])

  async function lookupVin() {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const contract = getReadContract()
      const exists = await contract.vinExists(vin.trim())

      if (!exists) {
        throw new Error('VIN is not registered in the registry')
      }

      const tokenId = await contract.tokenIdForVin(vin.trim())
      const loaded = await readTitle(BigInt(tokenId))
      setTitle(loaded)
      setStep(1)
    } catch (e: any) {
      console.error('VIN lookup failed:', e)
      setError(extractErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function submitTransfer() {
    if (!walletProvider || !title) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const paymentAmountValue = BigInt(paymentAmount || '0')
    const paymentTokenValue =
      paymentAmountValue === 0n
        ? '0x0000000000000000000000000000000000000000'
        : paymentToken.trim()

    const args = [
      title.tokenId,
      newHolder.trim(),
      paymentTokenValue,
      paymentAmountValue,
      holderNote.trim()
    ]

    try {
      await simulateWrite(walletProvider, 'transferTitleByHolder', args)
      const contract = await getWriteContract(walletProvider)
      const tx = await contract.transferTitleByHolder(...args)
      const receipt = await tx.wait()
      setSuccess(`Ownership transfer submitted successfully. Tx: ${receipt?.hash ?? tx.hash}`)
      setStep(2)
    } catch (e: any) {
      console.error('transferTitleByHolder failed:', e)
      setError(extractErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page
      title="Transfer Title"
      subtitle="Lookup the vehicle by VIN, review the active record, then transfer ownership to the next holder."
      warning={!connected ? 'Connect the current holder wallet to use this page.' : null}
    >
      <Stack spacing={3}>
        <Stepper activeStep={step}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {step === 0 && (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Step 1 — Lookup by VIN</Typography>
                <TextField
                  label="Vehicle VIN"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  fullWidth
                />
                <Button variant="contained" onClick={lookupVin} disabled={!vin.trim() || loading}>
                  Lookup Vehicle
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        {step >= 1 && title && (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Step 2 — Confirm Current Vehicle Record</Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography><strong>VIN:</strong> {title.record.vin}</Typography>
                    <Typography><strong>Vehicle:</strong> {title.record.year.toString()} {title.record.make} {title.record.model}</Typography>
                    <Typography><strong>Owner:</strong> {shortAddress(title.owner)}</Typography>
                    <Typography><strong>Mileage:</strong> {formatBigint(title.record.mileage)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip label={titleBrandLabel(title.record.brand)} />
                      <Chip label={recordStateLabel(title.record.state)} variant="outlined" />
                      <Chip label={title.record.legacyDigitized ? 'Legacy Digitised' : 'Manufacturer Origin'} variant="outlined" />
                    </Stack>
                  </Grid>
                </Grid>

                <Button variant="outlined" onClick={() => setStep(2)}>
                  Continue to Transfer
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        {step >= 1 && title && (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Step 3 — Enter New Holder Details</Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="New Holder Address"
                      value={newHolder}
                      onChange={(e) => setNewHolder(e.target.value)}
                      fullWidth
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Optional Payment Token"
                      value={paymentToken}
                      onChange={(e) => setPaymentToken(e.target.value)}
                      fullWidth
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Optional Payment Amount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      fullWidth
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Transfer Note"
                      value={holderNote}
                      onChange={(e) => setHolderNote(e.target.value)}
                      fullWidth
                      multiline
                      minRows={3}
                    />
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  onClick={submitTransfer}
                  disabled={!walletProvider || !connected || !canTransfer || loading}
                >
                  Transfer Ownership
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        {success ? <Alert severity="success">{success}</Alert> : null}
        <FormStatus loading={loading} error={error} success={null} />
      </Stack>
    </Page>
  )
}
