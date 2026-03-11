import { Button, Divider, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { Page } from '../components/Page'
import { FormStatus } from '../components/FormStatus'
import { RECORD_STATES, TITLE_BRANDS } from '../config'
import { getWriteContract, simulateWrite } from '../lib/contract'
import { extractErrorMessage } from '../utils/extractError'

export function RecordControlsPage({ walletProvider, canUse }: { walletProvider?: unknown; canUse: boolean }) {
  const [tokenId, setTokenId] = useState('')
  const [brand, setBrand] = useState('0')
  const [state, setState] = useState('0')
  const [qrCodeData, setQrCodeData] = useState('')
  const [newTokenURI, setNewTokenURI] = useState('')
  const [newHolder, setNewHolder] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function run(method: string, args: any[], message: string) {
    if (!walletProvider) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await simulateWrite(walletProvider, method, args)
      const contract = await getWriteContract(walletProvider)
      const tx = await (contract as any)[method](...args)
      const receipt = await tx.wait()
      setSuccess(`${message}. Tx: ${receipt?.hash ?? tx.hash}`)
    } catch (e: any) {
      console.error(`${method} failed:`, e)
      setError(extractErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page
      title="Record Controls"
      subtitle="Official update tools for regulators and authorised operators."
      warning={!canUse ? 'This page requires regulator or registrar access for most actions.' : null}
    >
      <Stack spacing={2}>
        <TextField label="Token ID" value={tokenId} onChange={(e) => setTokenId(e.target.value)} fullWidth />

        <Divider />
        <Typography variant="h6">Update title brand</Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField select label="Brand" fullWidth value={brand} onChange={(e) => setBrand(e.target.value)}>
              {TITLE_BRANDS.map((item, index) => (
                <MenuItem key={item} value={String(index)}>{item}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Official note" fullWidth value={note} onChange={(e) => setNote(e.target.value)} />
          </Grid>
        </Grid>

        <Button
          variant="contained"
          disabled={!walletProvider || !tokenId || loading || !canUse}
          onClick={() => void run('updateTitleBrand', [BigInt(tokenId), Number(brand), note.trim()], 'Title brand updated')}
        >
          Update Title Brand
        </Button>

        <Divider />
        <Typography variant="h6">Update record state</Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField select label="State" fullWidth value={state} onChange={(e) => setState(e.target.value)}>
              {RECORD_STATES.map((item, index) => (
                <MenuItem key={item} value={String(index)}>{item}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        <Button
          variant="contained"
          disabled={!walletProvider || !tokenId || loading || !canUse}
          onClick={() => void run('updateRecordState', [BigInt(tokenId), Number(state), note.trim()], 'Record state updated')}
        >
          Update Record State
        </Button>

        <Divider />
        <Typography variant="h6">Update metadata / reassign</Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="QR / reference data" fullWidth value={qrCodeData} onChange={(e) => setQrCodeData(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="New token URI" fullWidth value={newTokenURI} onChange={(e) => setNewTokenURI(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Reassign to holder" fullWidth value={newHolder} onChange={(e) => setNewHolder(e.target.value)} />
          </Grid>
        </Grid>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <Button
            variant="outlined"
            disabled={!walletProvider || !tokenId || loading || !canUse}
            onClick={() => void run('updateQrCodeData', [BigInt(tokenId), qrCodeData.trim()], 'QR/reference data updated')}
          >
            Update QR Data
          </Button>

          <Button
            variant="outlined"
            disabled={!walletProvider || !tokenId || loading || !canUse}
            onClick={() => void run('updateTokenURI', [BigInt(tokenId), newTokenURI.trim(), note.trim()], 'Token URI updated')}
          >
            Update Token URI
          </Button>

          <Button
            variant="outlined"
            disabled={!walletProvider || !tokenId || !newHolder || loading || !canUse}
            onClick={() => void run('reassignTitleByRegulator', [BigInt(tokenId), newHolder.trim(), note.trim()], 'Title reassigned by regulator')}
          >
            Reassign Title
          </Button>
        </Stack>

        <FormStatus loading={loading} error={error} success={success} />
      </Stack>
    </Page>
  )
}
