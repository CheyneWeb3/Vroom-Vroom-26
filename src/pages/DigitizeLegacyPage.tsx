import { Button, Grid, MenuItem, Stack, TextField } from '@mui/material'
import { useState } from 'react'
import { Page } from '../components/Page'
import { FormStatus } from '../components/FormStatus'
import { VinPlateScanner } from '../components/VinPlateScanner'
import { TITLE_BRANDS } from '../config'
import { getWriteContract, simulateWrite } from '../lib/contract'
import { extractErrorMessage } from '../utils/extractError'

type Props = { walletProvider?: unknown; canUse: boolean }

export function DigitizeLegacyPage({ walletProvider, canUse }: Props) {
  const [form, setForm] = useState({
    holder: '',
    vin: '',
    make: '',
    model: '',
    year: '',
    initialMileage: '',
    qrCodeData: '',
    brand: '0',
    initialTokenURI: '',
    officialNote: ''
  })

  const [scannerOpen, setScannerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit() {
    if (!walletProvider) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const args = [
      form.holder,
      form.vin.trim(),
      form.make.trim(),
      form.model.trim(),
      BigInt(form.year || '0'),
      BigInt(form.initialMileage || '0'),
      form.qrCodeData.trim(),
      Number(form.brand),
      form.initialTokenURI.trim(),
      form.officialNote.trim()
    ]

    try {
      await simulateWrite(walletProvider, 'digitizeLegacyTitle', args)
      const contract = await getWriteContract(walletProvider)
      const tx = await contract.digitizeLegacyTitle(...args)
      const receipt = await tx.wait()
      setSuccess(`Legacy title digitised. Tx: ${receipt?.hash ?? tx.hash}`)
    } catch (e: any) {
      console.error('digitizeLegacyTitle failed:', e)
      setError(extractErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page
      title="Digitise Legacy Title"
      subtitle="Registrar workflow for paper-title vehicles entering the digital system."
      warning={!canUse ? 'This page requires registrar access.' : null}
    >
      <Stack spacing={2}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="holder"
              value={form.holder}
              onChange={(e) => setForm((prev) => ({ ...prev, holder: e.target.value }))}
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.25}>
              <TextField
                label="vin"
                value={form.vin}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    vin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                  }))
                }
                fullWidth
              />

              <Button variant="outlined" onClick={() => setScannerOpen(true)}>
                Scan VIN Plate
              </Button>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="make"
              value={form.make}
              onChange={(e) => setForm((prev) => ({ ...prev, make: e.target.value }))}
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="model"
              value={form.model}
              onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="year"
              value={form.year}
              onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="initialMileage"
              value={form.initialMileage}
              onChange={(e) => setForm((prev) => ({ ...prev, initialMileage: e.target.value }))}
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="qrCodeData"
              value={form.qrCodeData}
              onChange={(e) => setForm((prev) => ({ ...prev, qrCodeData: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select
              label="Title brand"
              fullWidth
              value={form.brand}
              onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
            >
              {TITLE_BRANDS.map((item, index) => (
                <MenuItem key={item} value={String(index)}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              label="initialTokenURI"
              value={form.initialTokenURI}
              onChange={(e) => setForm((prev) => ({ ...prev, initialTokenURI: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              label="officialNote"
              value={form.officialNote}
              onChange={(e) => setForm((prev) => ({ ...prev, officialNote: e.target.value }))}
              fullWidth
              multiline
              minRows={3}
            />
          </Grid>
        </Grid>

        <Button variant="contained" onClick={submit} disabled={!walletProvider || !canUse || loading}>
          Digitise Legacy Title
        </Button>

        <FormStatus loading={loading} error={error} success={success} />

        <VinPlateScanner
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onApplyVin={(vin) =>
            setForm((prev) => ({
              ...prev,
              vin
            }))
          }
        />
      </Stack>
    </Page>
  )
}
