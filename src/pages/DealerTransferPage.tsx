import { Button, Grid, Stack, TextField } from '@mui/material'
import { useState } from 'react'
import { Page } from '../components/Page'
import { FormStatus } from '../components/FormStatus'
import { getWriteContract, simulateWrite } from '../lib/contract'
import { extractErrorMessage } from '../utils/extractError'

export function DealerTransferPage({ walletProvider, canUse }: { walletProvider?: unknown; canUse: boolean }) {
  const [form, setForm] = useState({
    tokenId: '',
    from: '',
    newHolder: '',
    dealerNote: ''
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
      BigInt(form.tokenId),
      form.from.trim(),
      form.newHolder.trim(),
      form.dealerNote.trim()
    ]

    try {
      await simulateWrite(walletProvider, 'transferTitleByDealer', args)
      const contract = await getWriteContract(walletProvider)
      const tx = await contract.transferTitleByDealer(...args)
      const receipt = await tx.wait()
      setSuccess(`Dealer transfer complete. Tx: ${receipt?.hash ?? tx.hash}`)
    } catch (e: any) {
      console.error('transferTitleByDealer failed:', e)
      setError(extractErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page
      title="Dealer Transfer"
      subtitle="Assisted transfer flow for approved dealer operators."
      warning={!canUse ? 'This page requires dealer access.' : null}
    >
      <Stack spacing={2}>
        <Grid container spacing={2}>
          {['tokenId', 'from', 'newHolder', 'dealerNote'].map((key) => (
            <Grid key={key} size={{ xs: 12, md: key === 'dealerNote' ? 12 : 6 }}>
              <TextField
                label={key}
                value={(form as any)[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                fullWidth
                multiline={key === 'dealerNote'}
                minRows={key === 'dealerNote' ? 3 : 1}
              />
            </Grid>
          ))}
        </Grid>

        <Button variant="contained" onClick={submit} disabled={!walletProvider || !canUse || loading}>
          Run Dealer Transfer
        </Button>

        <FormStatus loading={loading} error={error} success={success} />
      </Stack>
    </Page>
  )
}
