import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography
} from '@mui/material'
import { BrowserProvider, formatEther } from 'ethers'
import type { Eip1193Provider } from 'ethers'
import { useAppKit, useAppKitAccount, useAppKitProvider, useDisconnect } from '@reown/appkit/react'

const AVALANCHE_CHAIN_ID = 43114
const WAVAX_ADDRESS = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'

function shortAddr(addr?: string) {
  if (!addr) return ''
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

// Type guard that TS accepts for narrowing
function isEip1193Provider(provider: any): provider is Eip1193Provider {
  return provider && typeof provider === 'object' && typeof provider.request === 'function'
}

export default function App() {
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()

  const { address, isConnected, status } = useAppKitAccount({ namespace: 'eip155' })
  const { walletProvider } = useAppKitProvider('eip155')

  const [chainId, setChainId] = useState<number | null>(null)
  const [native, setNative] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wrongNetwork = useMemo(() => {
    return isConnected && chainId !== null && chainId !== AVALANCHE_CHAIN_ID
  }, [isConnected, chainId])

  const refreshBalances = useCallback(async () => {
    setError(null)
    setNative('')

    if (!isConnected) return
    if (!address) return
    if (!walletProvider) {
      setError('Wallet provider not available (try reconnecting).')
      return
    }

    setLoading(true)
    try {
      // Explicit type guard (TS now narrows walletProvider)
      if (!isEip1193Provider(walletProvider)) {
        throw new Error('Invalid wallet provider interface.')
      }

      const provider = new BrowserProvider(walletProvider)
      const net = await provider.getNetwork()
      const cid = Number(net.chainId)
      setChainId(cid)

      // Native AVAX balance (works on Fuji)
      const bal = await provider.getBalance(address)
      setNative(formatEther(bal))

      // WAVAX balance - commented out for Fuji testnet (contract doesn't exist)
      // const signer = await provider.getSigner()
      // const token = new Contract(WAVAX_ADDRESS, ERC20_ABI, signer)
      // const [sym, dec, raw] = await Promise.all([
      //   token.symbol(),
      //   token.decimals(),
      //   token.balanceOf(address)
      // ])
      // setWavaxSymbol(String(sym || 'WAVAX'))
      // setWavax(formatUnits(raw, Number(dec)))
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Failed to load balances')
    } finally {
      setLoading(false)
    }
  }, [isConnected, address, walletProvider])

  useEffect(() => {
    refreshBalances()
  }, [refreshBalances])

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="sm">
        <Stack spacing={2}>
          <Typography variant="h4" fontWeight={800}>
            Avalanche Balances
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Connect a wallet, then view your native AVAX balance on Fuji testnet.
          </Typography>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                  {!isConnected ? (
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => open({ view: 'Connect', namespace: 'eip155' })}
                    >
                      Connect Wallet
                    </Button>
                  ) : (
                    <>
                      <Button variant="outlined" onClick={() => open({ view: 'Account' })}>
                        {shortAddr(address)}
                      </Button>
                      <Button color="inherit" onClick={() => disconnect()}>
                        Disconnect
                      </Button>
                    </>
                  )}

                  <Box sx={{ flex: 1 }} />

                  <Typography variant="body2" color="text.secondary">
                    Status: {status}
                  </Typography>
                </Stack>

                <Divider />

                {error && <Alert severity="error">{error}</Alert>}

                {wrongNetwork && (
                  <Alert severity="warning">
                    You are connected to chainId <b>{chainId}</b>. Please switch your wallet to{' '}
                    <b>Avalanche C-Chain (43114)</b> and hit Refresh.
                  </Alert>
                )}

                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    variant="contained"
                    disabled={!isConnected || loading}
                    onClick={refreshBalances}
                  >
                    Refresh
                  </Button>
                  {loading && <CircularProgress size={20} />}
                  <Box sx={{ flex: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Chain: {chainId ?? '—'}
                  </Typography>
                </Stack>

                <Stack spacing={1}>
                  <Typography variant="h6">Balances</Typography>

                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Native (AVAX)</Typography>
                    <Typography fontFamily="monospace">{native ? `${native} AVAX` : '—'}</Typography>
                  </Stack>

                  {/* Wrapped balance disabled for Fuji testnet */}
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Wrapped</Typography>
                    <Typography fontFamily="monospace">— (testnet only)</Typography>
                  </Stack>
                </Stack>

                <Typography variant="caption" color="text.secondary">
                  WAVAX contract (mainnet only): {WAVAX_ADDRESS}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Typography variant="caption" color="text.secondary">
            Tip: Set <code>VITE_PROJECT_ID</code> in your <code>.env</code> for your own Reown project.
          </Typography>
        </Stack>
      </Container>
    </Box>
  )
}