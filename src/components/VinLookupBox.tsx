import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getReadContract } from '../lib/contract'

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): {
        detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>
      }
      getSupportedFormats?: () => Promise<string[]>
    }
  }
}

export function VinLookupBox({
  title = 'VIN Lookup',
  subtitle = 'Enter a VIN or scan its QR code to open the vehicle record.'
}: {
  title?: string
  subtitle?: string
}) {
  const [vin, setVin] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)

  async function handleLookup(overrideVin?: string) {
    const lookupVin = (overrideVin ?? vin).trim()

    if (!lookupVin) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const contract = getReadContract()
      const exists = await contract.vinExists(lookupVin)

      if (!exists) {
        setResult('VIN is not yet digitised in the registry.')
        return
      }

      const tokenId = await contract.tokenIdForVin(lookupVin)
      setResult(`VIN found on-chain. Token #${tokenId.toString()}.`)
      navigate(`/titles/${tokenId.toString()}`)
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  function stopScanner() {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setScanning(false)
  }

  async function openScanner() {
    setScannerError(null)
    setScannerOpen(true)

    try {
      if (!window.BarcodeDetector) {
        throw new Error('QR scanning is not supported in this browser.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      })

      streamRef.current = stream

      if (!videoRef.current) {
        throw new Error('Video element not ready.')
      }

      videoRef.current.srcObject = stream
      await videoRef.current.play()

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      setScanning(true)

      const scanLoop = async () => {
        try {
          if (!videoRef.current) return

          const results = await detector.detect(videoRef.current)

          if (results.length > 0) {
            const rawValue = (results[0].rawValue || '').trim()

            if (rawValue) {
              setVin(rawValue)
              stopScanner()
              setScannerOpen(false)
              void handleLookup(rawValue)
              return
            }
          }
        } catch {
          // ignore frame-level scan errors
        }

        frameRef.current = requestAnimationFrame(scanLoop)
      }

      frameRef.current = requestAnimationFrame(scanLoop)
    } catch (e: any) {
      setScannerError(e?.message || 'Unable to access camera for QR scan.')
      stopScanner()
    }
  }

  function closeScanner() {
    stopScanner()
    setScannerOpen(false)
  }

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  return (
    <>
      <Stack spacing={2}>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>

        <TextField
          label="VIN"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          fullWidth
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button variant="contained" onClick={() => void handleLookup()} disabled={!vin.trim() || loading}>
            Lookup VIN
          </Button>

          <Button variant="outlined" onClick={() => void openScanner()}>
            Scan QR
          </Button>
        </Stack>

        {result ? <Alert severity="success">{result}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>

      <Dialog open={scannerOpen} onClose={closeScanner} maxWidth="sm" fullWidth>
        <DialogTitle>Scan VIN QR</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Point the camera at the VIN QR code. The VIN will be read and looked up automatically.
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

            {scanning ? (
              <Alert severity="info">Scanning for VIN QR…</Alert>
            ) : null}

            {scannerError ? <Alert severity="error">{scannerError}</Alert> : null}

            <Stack direction="row" spacing={1.5}>
              <Button variant="outlined" onClick={closeScanner}>
                Close
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  )
}
