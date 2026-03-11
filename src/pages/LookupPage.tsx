import { Alert, Button, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../components/Page'
import { getReadContract } from '../lib/contract'

export function LookupPage() {
  const [vin, setVin] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleLookup() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const contract = getReadContract()
      const exists = await contract.vinExists(vin)

      if (!exists) {
        setResult('VIN is not yet digitised in the registry.')
        return
      }

      const tokenId = await contract.tokenIdForVin(vin)
      setResult(`VIN found on-chain. Token #${tokenId.toString()}.`)
      navigate(`/titles/${tokenId.toString()}`)
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page title="VIN Lookup" subtitle="Check whether a VIN is already registered and open the matching title record.">
      <Stack spacing={2}>
        <TextField label="VIN" value={vin} onChange={(e) => setVin(e.target.value)} fullWidth />
        <Button variant="contained" onClick={handleLookup} disabled={!vin || loading}>
          Lookup VIN
        </Button>
        {result ? <Alert severity="success">{result}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Typography variant="body2" color="text.secondary">
          The contract enforces VIN uniqueness on-chain, so this page is also the fastest way to check duplication before digitising a legacy record.
        </Typography>
      </Stack>
    </Page>
  )
}
