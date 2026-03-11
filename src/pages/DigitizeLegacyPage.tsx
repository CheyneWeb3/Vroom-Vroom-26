import { Box, Button, Grid, MenuItem, Stack, TextField, Typography, Card, CardContent } from '@mui/material'
import { useState } from 'react'
import { Page } from '../components/Page'
import { FormStatus } from '../components/FormStatus'
import { VinPlateScanner, type OcrVehicleFields } from '../components/VinPlateScanner'
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
  const [sourceImage, setSourceImage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function applyOcrFields(fields: OcrVehicleFields) {
    setForm((prev) => ({
      ...prev,
      vin: fields.vin || prev.vin,
      year: fields.year || prev.year,
      make: fields.make || prev.make,
      model: fields.model || prev.model,
      initialMileage: fields.initialMileage || prev.initialMileage,
      qrCodeData: fields.qrCodeData || prev.qrCodeData,
      officialNote: fields.officialNote
        ? prev.officialNote
          ? `${prev.officialNote}\n\n${fields.officialNote}`
          : fields.officialNote
        : prev.officialNote
    }))

    if (fields.sourceImage) {
      setSourceImage(fields.sourceImage)
    }
  }

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
      <Stack spacing={2.5}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
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
                      Scan VIN Plate / Upload Title Image
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
                    minRows={5}
                  />
                </Grid>
              </Grid>

              <Button variant="contained" onClick={submit} disabled={!walletProvider || !canUse || loading}>
                Digitise Legacy Title
              </Button>

              <FormStatus loading={loading} error={error} success={success} />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Card
              sx={{
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.08)',
                bgcolor: 'rgba(255,255,255,0.02)',
                boxShadow: 'none'
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <Typography variant="h6" fontWeight={800}>
                    OCR Source Preview
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Clerk review image used for OCR extraction before final submission.
                  </Typography>

                  {sourceImage ? (
                    <Box
                      component="img"
                      src={sourceImage}
                      alt="OCR source preview"
                      sx={{
                        width: '100%',
                        maxHeight: 420,
                        objectFit: 'contain',
                        borderRadius: 1.5,
                        border: '1px solid rgba(255,255,255,0.08)',
                        bgcolor: 'rgba(255,255,255,0.02)'
                      }}
                    />
                  ) : (
                    <Typography color="text.secondary">
                      No OCR source image applied yet.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <VinPlateScanner
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onApplyVin={(vin) =>
            setForm((prev) => ({
              ...prev,
              vin
            }))
          }
          onApplyFields={applyOcrFields}
        />
      </Stack>
    </Page>
  )
}
