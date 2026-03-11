import { Button, Grid, MenuItem, Stack, TextField } from '@mui/material'
import { useState } from 'react'
import { Page } from '../components/Page'
import { FormStatus } from '../components/FormStatus'
import { TITLE_BRANDS } from '../config'
import { getWriteContract, simulateWrite } from '../lib/contract'
import { extractErrorMessage } from '../utils/extractError'

export function MintNewVehiclePage({ walletProvider, canUse }: { walletProvider?: unknown; canUse: boolean }) {
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
      await simulateWrite(walletProvider, 'mintNewVehicleTitle', args)
      const contract = await getWriteContract(walletProvider)
      const tx = await contract.mintNewVehicleTitle(...args)
      const receipt = await tx.wait()
      setSuccess(`Manufacturer title minted. Tx: ${receipt?.hash ?? tx.hash}`)
    } catch (e: any) {
      console.error('mintNewVehicleTitle failed:', e)
      setError(extractErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page
      title="Mint New Vehicle Title"
      subtitle="Manufacturer workflow for newly originated vehicles."
      warning={!canUse ? 'This page requires manufacturer access.' : null}
    >
      <Stack spacing={2}>
        <Grid container spacing={2}>
          {['holder', 'vin', 'make', 'model', 'year', 'initialMileage', 'qrCodeData', 'initialTokenURI', 'officialNote'].map((key) => (
            <Grid key={key} size={{ xs: 12, md: key === 'officialNote' || key === 'initialTokenURI' || key === 'qrCodeData' ? 12 : 6 }}>
              <TextField
                label={key}
                value={(form as any)[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                fullWidth
                multiline={key === 'officialNote' || key === 'initialTokenURI' || key === 'qrCodeData'}
                minRows={key === 'officialNote' ? 3 : 1}
              />
            </Grid>
          ))}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select
              label="Title brand"
              fullWidth
              value={form.brand}
              onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
            >
              {TITLE_BRANDS.map((item, index) => (
                <MenuItem key={item} value={String(index)}>{item}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        <Button variant="contained" onClick={submit} disabled={!walletProvider || !canUse || loading}>
          Mint New Vehicle Title
        </Button>

        <FormStatus loading={loading} error={error} success={success} />
      </Stack>
    </Page>
  )
}
