import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import Tesseract from 'tesseract.js'

export type OcrVehicleFields = {
  vin?: string
  year?: string
  make?: string
  model?: string
  initialMileage?: string
  qrCodeData?: string
  officialNote?: string
  sourceImage?: string
}

type Props = {
  open: boolean
  onClose: () => void
  onApplyVin: (vin: string) => void
  onApplyFields?: (fields: OcrVehicleFields) => void
}

function normalizeOcrText(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[|]/g, 'I')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
}

function normalizeVinCandidate(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/O/g, '0')
    .replace(/Q/g, '0')
}

function isValidVinLike(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin)
}

function cleanLooseValue(value: string): string {
  return normalizeOcrText(value).replace(/\s+/g, ' ').trim()
}

function cleanSingleToken(value: string): string {
  return cleanLooseValue(value).replace(/[^A-Z0-9/-]/g, ' ').replace(/\s+/g, ' ').trim()
}

function linesAroundLabel(lines: string[], labelMatchers: RegExp[]): string[] {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (labelMatchers.some((rx) => rx.test(line))) {
      return [
        line,
        lines[i + 1] || '',
        lines[i + 2] || '',
        lines[i + 3] || ''
      ].filter(Boolean)
    }
  }
  return []
}

function extractVinFromText(raw: string): string {
  const upper = normalizeOcrText(raw)
  const lines = upper.split('\n').map((s) => s.trim()).filter(Boolean)

  const vinContext = linesAroundLabel(lines, [
    /VEHICLE IDENTIFICATION NUMBER/,
    /\bVIN\b/
  ])

  if (vinContext.length) {
    const joined = vinContext.join(' ')
    const parts = joined.replace(/[^A-Z0-9]/g, ' ').split(/\s+/).filter(Boolean)

    for (const part of parts) {
      const candidate = normalizeVinCandidate(part)
      if (candidate.length === 17 && isValidVinLike(candidate)) {
        return candidate
      }
    }
  }

  // fallback to full-text scan
  const parts = upper.replace(/[^A-Z0-9]/g, ' ').split(/\s+/).filter(Boolean)
  for (const part of parts) {
    const candidate = normalizeVinCandidate(part)
    if (candidate.length === 17 && isValidVinLike(candidate)) {
      return candidate
    }
  }

  return ''
}

function extractTitleDocFromText(raw: string): string {
  const upper = normalizeOcrText(raw)
  const lines = upper.split('\n').map((s) => s.trim()).filter(Boolean)

  const ctx = linesAroundLabel(lines, [/TITLE DOCUMENT NUMBER/, /DOCUMENT NUMBER/])
  const joined = ctx.join(' ')

  const parts = joined.replace(/[^A-Z0-9]/g, ' ').split(/\s+/).filter(Boolean)

  for (const part of parts) {
    const cleaned = part.replace(/[^A-Z0-9]/g, '')
    if (cleaned.length >= 10 && cleaned.length <= 24) {
      return cleaned
    }
  }

  return ''
}

function extractYear(raw: string): string {
  const upper = normalizeOcrText(raw)
  const lines = upper.split('\n').map((s) => s.trim()).filter(Boolean)

  const ctx = linesAroundLabel(lines, [/YEAR MODEL/, /\bYEAR\b/]).join(' ')
  return ctx.match(/\b(19\d{2}|20\d{2})\b/)?.[1] ?? ''
}

function normalizeMake(raw: string): string {
  const upper = normalizeOcrText(raw)
  const lines = upper.split('\n').map((s) => s.trim()).filter(Boolean)

  const ctx = linesAroundLabel(lines, [/MAKE OF VEHICLE/, /\bMAKE\b/]).join(' ')

  if (ctx.includes('LEXUS') || ctx.includes('LEXS')) return 'LEXUS'
  if (ctx.includes('TOYOTA')) return 'TOYOTA'
  if (ctx.includes('HONDA')) return 'HONDA'
  if (ctx.includes('FORD')) return 'FORD'
  if (ctx.includes('BMW')) return 'BMW'
  if (ctx.includes('AUDI')) return 'AUDI'

  const parts = ctx.replace(/[^A-Z0-9-]/g, ' ').split(/\s+/).filter(Boolean)
  const banned = new Set(['MAKE', 'OF', 'VEHICLE'])
  const candidate = parts.find((p) => !banned.has(p))
  return candidate || ''
}

function normalizeModel(raw: string): string {
  const upper = normalizeOcrText(raw)
  const lines = upper.split('\n').map((s) => s.trim()).filter(Boolean)

  const ctx = linesAroundLabel(lines, [/\bMODEL\b/]).join(' ')
  const parts = ctx.replace(/[^A-Z0-9-]/g, ' ').split(/\s+/).filter(Boolean)
  const banned = new Set(['MODEL', 'MAKE', 'YEAR', 'VEHICLE', 'CAPACITY', 'WEIGHT'])

  const candidate = parts.find((p) => !banned.has(p))
  return candidate || ''
}

function extractMileage(raw: string): string {
  const upper = normalizeOcrText(raw)
  const lines = upper.split('\n').map((s) => s.trim()).filter(Boolean)

  const ctx = linesAroundLabel(lines, [/ODOMETER READING/, /ACTUAL MILEAGE/, /\bMILEAGE\b/]).join(' ')
  return ctx.match(/\b([0-9]{1,7})\b/)?.[1] ?? ''
}

function buildFieldsFromFullPageOcr(rawText: string, sourceImage?: string): OcrVehicleFields {
  const vin = extractVinFromText(rawText)
  const year = extractYear(rawText)
  const make = normalizeMake(rawText)
  const model = normalizeModel(rawText)
  const initialMileage = extractMileage(rawText)
  const titleDoc = extractTitleDocFromText(rawText)

  const qrCodeDataParts = [
    titleDoc ? `TitleDoc: ${titleDoc}` : '',
    initialMileage ? `Mileage: ${initialMileage}` : '',
    vin ? `VIN: ${vin}` : ''
  ].filter(Boolean)

  const officialNoteParts = [
    'OCR import from captured/uploaded vehicle title image.',
    vin ? `VIN detected: ${vin}.` : '',
    year ? `Year detected: ${year}.` : '',
    make ? `Make detected: ${make}.` : '',
    model ? `Model detected: ${model}.` : '',
    initialMileage ? `Mileage detected: ${initialMileage}.` : '',
    titleDoc ? `Title document number detected: ${titleDoc}.` : '',
    'Manual review recommended before final submission.'
  ].filter(Boolean)

  return {
    vin,
    year,
    make,
    model,
    initialMileage,
    qrCodeData: qrCodeDataParts.join(' | '),
    officialNote: officialNoteParts.join(' '),
    sourceImage
  }
}

export function VinPlateScanner({ open, onClose, onApplyVin, onApplyFields }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [previewSrc, setPreviewSrc] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [rawText, setRawText] = useState('')
  const [candidateVin, setCandidateVin] = useState('')
  const [parsedFields, setParsedFields] = useState<OcrVehicleFields>({})
  const [usedUpload, setUsedUpload] = useState(false)

  const canApplyVin = useMemo(() => isValidVinLike(candidateVin), [candidateVin])

  async function startCamera() {
    setCameraError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (e: any) {
      setCameraError(e?.message || 'Unable to access camera.')
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  async function runOcrFromImageSource(imageSource: string) {
    setOcrLoading(true)
    setOcrProgress(0)
    setOcrError(null)
    setRawText('')
    setCandidateVin('')
    setParsedFields({})

    try {
      const passes: string[] = []

      for (let i = 0; i < 3; i++) {
        const result = await Tesseract.recognize(imageSource, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text' && typeof m.progress === 'number') {
              const overall = ((i + m.progress) / 3) * 100
              setOcrProgress(Math.round(overall))
            }
          }
        })
        passes.push(result.data.text || '')
      }

      const mergedText = passes.join('\n\n')
      const fields = buildFieldsFromFullPageOcr(mergedText, imageSource)

      setRawText(
        passes.map((text, index) => `--- OCR PASS ${index + 1} ---\n${text.trim()}`).join('\n\n')
      )
      setCandidateVin(fields.vin || '')
      setParsedFields(fields)

      if (!fields.vin) {
        setOcrError('No valid VIN could be extracted from the full document OCR. Try a clearer image or crop closer to the VIN/title fields.')
      }
    } catch (e: any) {
      setOcrError(e?.message || 'OCR failed.')
    } finally {
      setOcrLoading(false)
      setOcrProgress(0)
    }
  }

  async function captureAndRead() {
    setUsedUpload(false)

    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    setPreviewSrc(dataUrl)
    await runOcrFromImageSource(dataUrl)
  }

  async function handleFileChange(file?: File | null) {
    if (!file) return

    setUsedUpload(true)
    setCameraError(null)

    const reader = new FileReader()
    reader.onload = async () => {
      const result = String(reader.result || '')
      setPreviewSrc(result)
      stopCamera()
      await runOcrFromImageSource(result)
    }
    reader.readAsDataURL(file)
  }

  function handleApplyVin() {
    if (!canApplyVin) return
    onApplyVin(candidateVin)
    onClose()
  }

  function handleApplyFields() {
    if (!onApplyFields) return
    onApplyFields({
      ...parsedFields,
      vin: candidateVin || parsedFields.vin || '',
      sourceImage: previewSrc || parsedFields.sourceImage
    })
    onClose()
  }

  useEffect(() => {
    if (open) {
      void startCamera()
    } else {
      stopCamera()
      setCameraError(null)
      setOcrError(null)
      setRawText('')
      setCandidateVin('')
      setParsedFields({})
      setPreviewSrc('')
      setOcrLoading(false)
      setOcrProgress(0)
      setUsedUpload(false)
    }

    return () => {
      stopCamera()
    }
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Scan or Upload VIN Image</DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            OCR now reads the full document and maps values by label, so the Vehicle Identification Number should be separated from the title document number.
          </Typography>

          {!usedUpload ? (
            <Box
              sx={{
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: '#000',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', display: 'block' }}
              />
            </Box>
          ) : null}

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="contained" onClick={() => void captureAndRead()} disabled={ocrLoading}>
              {ocrLoading ? 'Reading OCR…' : 'Capture & Read'}
            </Button>

            <Button variant="outlined" onClick={() => fileInputRef.current?.click()} disabled={ocrLoading}>
              Upload Image
            </Button>

            <Button variant="outlined" onClick={() => void startCamera()} disabled={ocrLoading}>
              Restart Camera
            </Button>
          </Stack>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
          />

          {previewSrc ? (
            <Box
              component="img"
              src={previewSrc}
              alt="OCR preview"
              sx={{
                width: '100%',
                maxHeight: 320,
                objectFit: 'contain',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.08)',
                bgcolor: 'rgba(255,255,255,0.02)'
              }}
            />
          ) : null}

          {ocrLoading ? <LinearProgress variant="determinate" value={ocrProgress} /> : null}

          {!usedUpload && cameraError ? <Alert severity="error">{cameraError}</Alert> : null}
          {ocrError ? <Alert severity="warning">{ocrError}</Alert> : null}

          <TextField
            label="Detected VIN"
            value={candidateVin}
            onChange={(e) => setCandidateVin(normalizeVinCandidate(e.target.value))}
            fullWidth
            helperText="Review this before applying it to the form."
          />

          <Stack spacing={1}>
            <Typography variant="subtitle2">Parsed OCR Fields</Typography>
            <TextField label="Year" value={parsedFields.year || ''} fullWidth InputProps={{ readOnly: true }} />
            <TextField label="Make" value={parsedFields.make || ''} fullWidth InputProps={{ readOnly: true }} />
            <TextField label="Model" value={parsedFields.model || ''} fullWidth InputProps={{ readOnly: true }} />
            <TextField label="Mileage" value={parsedFields.initialMileage || ''} fullWidth InputProps={{ readOnly: true }} />
            <TextField label="QR / Reference Data" value={parsedFields.qrCodeData || ''} fullWidth InputProps={{ readOnly: true }} />
          </Stack>

          <TextField
            label="Raw OCR Text"
            value={rawText}
            fullWidth
            multiline
            minRows={6}
            InputProps={{ readOnly: true }}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="outlined" onClick={handleApplyVin} disabled={!canApplyVin}>
          Use VIN Only
        </Button>
        <Button variant="contained" onClick={handleApplyFields} disabled={!candidateVin && !parsedFields.year && !parsedFields.make}>
          Use OCR Data
        </Button>
      </DialogActions>
    </Dialog>
  )
}
