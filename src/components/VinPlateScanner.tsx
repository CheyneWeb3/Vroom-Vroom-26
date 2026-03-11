import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import Tesseract from 'tesseract.js'

type Props = {
  open: boolean
  onClose: () => void
  onApplyVin: (vin: string) => void
}

function extractLikelyVin(raw: string): string {
  const upper = raw.toUpperCase()

  // keep only alphanumeric and split into candidate chunks
  const cleaned = upper.replace(/[^A-Z0-9]/g, ' ')
  const parts = cleaned.split(/\s+/).filter(Boolean)

  // direct 17-char candidates first
  for (const part of parts) {
    if (/^[A-HJ-NPR-Z0-9]{17}$/.test(part)) {
      return part
    }
  }

  // fallback: smash everything together and try rolling 17-char windows
  const joined = upper.replace(/[^A-Z0-9]/g, '')
  for (let i = 0; i <= joined.length - 17; i++) {
    const chunk = joined.slice(i, i + 17)
    if (/^[A-HJ-NPR-Z0-9]{17}$/.test(chunk)) {
      return chunk
    }
  }

  return ''
}

export function VinPlateScanner({ open, onClose, onApplyVin }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraError, setCameraError] = useState<string | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [rawText, setRawText] = useState('')
  const [candidateVin, setCandidateVin] = useState('')

  const canApply = useMemo(() => /^[A-HJ-NPR-Z0-9]{17}$/.test(candidateVin), [candidateVin])

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

  async function captureAndRead() {
    if (!videoRef.current || !canvasRef.current) return

    setOcrLoading(true)
    setOcrError(null)
    setRawText('')
    setCandidateVin('')

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Canvas context unavailable.')
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95)

      const result = await Tesseract.recognize(dataUrl, 'eng', {
        logger: () => {}
      })

      const text = result.data.text || ''
      const vin = extractLikelyVin(text)

      setRawText(text.trim())
      setCandidateVin(vin)

      if (!vin) {
        setOcrError('No valid 17-character VIN could be extracted. Try moving closer, reducing glare, and capturing again.')
      }
    } catch (e: any) {
      setOcrError(e?.message || 'OCR failed.')
    } finally {
      setOcrLoading(false)
    }
  }

  function handleApply() {
    if (!canApply) return
    onApplyVin(candidateVin)
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
      setOcrLoading(false)
    }

    return () => {
      stopCamera()
    }
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Scan VIN Plate</DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Point the camera at the VIN plate, then capture the image. OCR will try to extract a valid 17-character VIN.
          </Typography>

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

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="contained" onClick={() => void captureAndRead()} disabled={ocrLoading}>
              {ocrLoading ? 'Reading VIN…' : 'Capture & Read VIN'}
            </Button>

            <Button variant="outlined" onClick={() => void startCamera()} disabled={ocrLoading}>
              Restart Camera
            </Button>
          </Stack>

          {cameraError ? <Alert severity="error">{cameraError}</Alert> : null}
          {ocrError ? <Alert severity="warning">{ocrError}</Alert> : null}

          <TextField
            label="Detected VIN"
            value={candidateVin}
            onChange={(e) => setCandidateVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            fullWidth
            helperText="Review this before applying it to the form."
          />

          <TextField
            label="Raw OCR Text"
            value={rawText}
            fullWidth
            multiline
            minRows={4}
            InputProps={{ readOnly: true }}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={handleApply} disabled={!canApply}>
          Use VIN
        </Button>
      </DialogActions>
    </Dialog>
  )
}
