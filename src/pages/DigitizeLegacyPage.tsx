import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { useMemo, useState } from 'react'
import { Page } from '../components/Page'
import { FormStatus } from '../components/FormStatus'
import { VinPlateScanner, type OcrVehicleFields } from '../components/VinPlateScanner'
import { TITLE_BRANDS } from '../config'
import { getWriteContract, simulateWrite } from '../lib/contract'
import { extractErrorMessage } from '../utils/extractError'

type Props = { walletProvider?: unknown; canUse: boolean }

function Section({
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
        boxShadow: 'none'
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
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

  const canSubmit = useMemo(() => {
    return (
      !!walletProvider &&
      canUse &&
      !!form.holder.trim() &&
      !!form.vin.trim() &&
      !!form.make.trim() &&
      !!form.model.trim() &&
      !!form.year.trim()
    )
  }, [walletProvider, canUse, form])

  function applyOcrFields(fields: OcrVehicleFields) {
    const vinOnly = (fields.vin || '').trim()

    setForm((prev) => ({
      ...prev,
      vin: fields.vin || prev.vin,
      year: fields.year || prev.year,
      make: fields.make || prev.make,
      model: fields.model || prev.model,
      initialMileage: fields.initialMileage || prev.initialMileage,
      qrCodeData: vinOnly || prev.qrCodeData,
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

    if (!form.holder.trim()) {
      setError('Holder wallet address is required.')
      return
    }

    if (!form.vin.trim()) {
      setError('VIN is required.')
      return
    }

    if (!form.make.trim() || !form.model.trim() || !form.year.trim()) {
      setError('Make, model, and year are required.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const args = [
      form.holder.trim(),
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
        <Alert severity="info">
          Use OCR to assist data entry, then review and correct the fields before final submission.
        </Alert>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={2}>
              <Section
                title="Primary Record Details"
                subtitle="Enter the receiving holder wallet and the core vehicle identity details."
              >
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Holder Wallet Address"
                      value={form.holder}
                      onChange={(e) => setForm((prev) => ({ ...prev, holder: e.target.value }))}
                      fullWidth
                      required
                      helperText="Required. This wallet will receive the digital title."
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={1.25}>
                      <TextField
                        label="VIN"
                        value={form.vin}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            vin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                            qrCodeData: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                          }))
                        }
                        fullWidth
                        required
                        helperText="Required. VIN also populates QR/reference data."
                      />

                      <Button variant="outlined" onClick={() => setScannerOpen(true)}>
                        Scan VIN Plate / Upload Title Image
                      </Button>
                    </Stack>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Make"
                      value={form.make}
                      onChange={(e) => setForm((prev) => ({ ...prev, make: e.target.value }))}
                      fullWidth
                      required
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Model"
                      value={form.model}
                      onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                      fullWidth
                      required
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Year"
                      value={form.year}
                      onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
                      fullWidth
                      required
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Initial Mileage"
                      value={form.initialMileage}
                      onChange={(e) => setForm((prev) => ({ ...prev, initialMileage: e.target.value }))}
                      fullWidth
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      select
                      label="Title Brand"
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
                </Grid>
              </Section>

              <Section
                title="Registry Metadata"
                subtitle="Keep QR/reference data simple. For now it should just be the VIN."
              >
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="QR / Reference Data"
                      value={form.qrCodeData}
                      onChange={(e) => setForm((prev) => ({ ...prev, qrCodeData: e.target.value }))}
                      fullWidth
                      helperText="For the current workflow, this should be the VIN only."
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Initial Token URI"
                      value={form.initialTokenURI}
                      onChange={(e) => setForm((prev) => ({ ...prev, initialTokenURI: e.target.value }))}
                      fullWidth
                      multiline
                      minRows={2}
                      helperText="Optional. Leave blank for now unless you have a proper metadata URI."
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Official Note"
                      value={form.officialNote}
                      onChange={(e) => setForm((prev) => ({ ...prev, officialNote: e.target.value }))}
                      fullWidth
                      multiline
                      minRows={5}
                    />
                  </Grid>
                </Grid>
              </Section>

              <Section title="Submit">
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                  <Button
                    variant="contained"
                    onClick={submit}
                    disabled={!canSubmit || loading}
                  >
                    Digitise Legacy Title
                  </Button>
                </Stack>

                {!form.holder.trim() ? (
                  <Typography variant="body2" color="warning.main">
                    Holder wallet address must be entered before submission.
                  </Typography>
                ) : null}
              </Section>

              <FormStatus loading={loading} error={error} success={success} />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Section
              title="OCR Source Preview"
              subtitle="Review the uploaded or captured certificate image while checking the form fields."
            >
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

              <Divider />

              <Typography variant="body2" color="text.secondary">
                Clerk flow: upload or scan the certificate, apply OCR data, review the image, then manually correct the form before submission.
              </Typography>
            </Section>
          </Grid>
        </Grid>

        <VinPlateScanner
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onApplyVin={(vin) =>
            setForm((prev) => ({
              ...prev,
              vin,
              qrCodeData: vin
            }))
          }
          onApplyFields={applyOcrFields}
        />
      </Stack>
    </Page>
  )
}
