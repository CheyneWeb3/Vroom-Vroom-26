import { Button, Grid, Stack, TextField } from '@mui/material'
import { useState } from 'react'
import { Page } from '../components/Page'
import { FormStatus } from '../components/FormStatus'
import { getWriteContract, simulateWrite } from '../lib/contract'
import { extractErrorMessage } from '../utils/extractError'

export function TransferTitlePage({ walletProvider, connected }: { walletProvider?: unknown; connected: boolean }) {
  const [form, setForm] = useState({
    tokenId: '',
    newHolder: '',
    paymentToken: '',
    paymentAmount: '0',
    holderNote: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit() {
    if (!walletProvider) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const paymentAmount = BigInt(form.paymentAmount || '0')
    const paymentToken =
      paymentAmount === 0n
        ? '0x0000000000000000000000000000000000000000'
        : form.paymentToken.trim()

    const args = [
      BigInt(form.tokenId),
      form.newHolder.trim(),
      paymentToken,
      paymentAmount,
      form.holderNote.trim()
    ]

    try {
      await simulateWrite(walletProvider, 'transferTitleByHolder', args)
      const contract = await getWriteContract(walletProvider)
      const tx = await contract.transferTitleByHolder(...args)
      const receipt = await tx.wait()
      setSuccess(`Title transferred. Tx: ${receipt?.hash ?? tx.hash}`)
    } catch (e: any) {
      console.error('transferTitleByHolder failed:', e)
      setError(extractErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page
      title="Transfer Title"
      subtitle="Standard holder-driven transfer workflow."
      warning={!connected ? 'Connect the current holder wallet to use this page.' : null}
    >
      <Stack spacing={2}>
        <Grid container spacing={2}>
          {['tokenId', 'newHolder', 'paymentToken', 'paymentAmount', 'holderNote'].map((key) => (
            <Grid key={key} size={{ xs: 12, md: key === 'holderNote' ? 12 : 6 }}>
              <TextField
                label={key}
                value={(form as any)[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                fullWidth
                multiline={key === 'holderNote'}
                minRows={key === 'holderNote' ? 3 : 1}
              />
            </Grid>
          ))}
        </Grid>

        <Button variant="contained" onClick={submit} disabled={!walletProvider || !connected || loading}>
          Transfer Title
        </Button>

        <FormStatus loading={loading} error={error} success={success} />
      </Stack>
    </Page>
  )
}
