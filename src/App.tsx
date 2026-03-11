import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Alert, Stack, Typography } from '@mui/material'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { MyTitlesPage } from './pages/MyTitlesPage'
import { LookupPage } from './pages/LookupPage'
import { TitleDetailsPage } from './pages/TitleDetailsPage'
import { DigitizeLegacyPage } from './pages/DigitizeLegacyPage'
import { MintNewVehiclePage } from './pages/MintNewVehiclePage'
import { TransferTitlePage } from './pages/TransferTitlePage'
import { DealerTransferPage } from './pages/DealerTransferPage'
import { RecordControlsPage } from './pages/RecordControlsPage'
import { RoleManagementPage } from './pages/RoleManagementPage'
import { getOwnedTokenIds, getRecentMintedTokenIds } from './lib/indexing'
import { readTitlesBatch } from './lib/contract'
import { useWalletState } from './hooks/useWalletState'
import { useRoles } from './hooks/useRoles'
import type { OwnedTitle } from './types'
import { extractErrorMessage } from './utils/extractError'

function RoutedApp() {
  const {
    open,
    disconnect,
    address,
    isConnected,
    walletProvider,
    wrongNetwork,
    switchToDefaultChain
  } = useWalletState()

  const { roles } = useRoles(address)
  const [ownedTitles, setOwnedTitles] = useState<OwnedTitle[]>([])
  const [recentTitles, setRecentTitles] = useState<OwnedTitle[]>([])
  const [loadingError, setLoadingError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadRecent() {
      try {
        const recentIds = await getRecentMintedTokenIds(6)
        const recent = await readTitlesBatch(recentIds)
        if (!cancelled) setRecentTitles(recent)
      } catch (e: any) {
        console.error('Recent titles load failed:', e)
        if (!cancelled) {
          setLoadingError((prev) =>
            prev ?? `Recent titles failed: ${extractErrorMessage(e)}`
          )
        }
      }
    }

    async function loadOwned() {
      if (!address) {
        if (!cancelled) setOwnedTitles([])
        return
      }

      try {
        const ownedIds = await getOwnedTokenIds(address)
        const owned = await readTitlesBatch(ownedIds)
        if (!cancelled) setOwnedTitles(owned)
      } catch (e: any) {
        console.error('Owned titles load failed:', e)
        if (!cancelled) {
          setLoadingError((prev) =>
            prev ?? `Owned titles failed: ${extractErrorMessage(e)}`
          )
        }
      }
    }

    setLoadingError(null)
    void loadRecent()
    void loadOwned()

    return () => {
      cancelled = true
    }
  }, [address])

  return (
    <AppShell
      address={address}
      isConnected={isConnected}
      onConnect={() => open({ view: 'Connect', namespace: 'eip155' })}
      onDisconnect={() => void disconnect()}
      onAccount={() => open({ view: 'Account' })}
      roles={roles}
    >
      {loadingError ? <Alert severity="warning" sx={{ mb: 3 }}>{loadingError}</Alert> : null}

      <Routes>
        <Route
          path="/"
          element={
            <DashboardPage
              roles={roles}
              ownedTitles={ownedTitles}
              recentTitles={recentTitles}
              wrongNetwork={wrongNetwork}
              onSwitchNetwork={() => void switchToDefaultChain()}
            />
          }
        />
        <Route path="/titles" element={<MyTitlesPage titles={ownedTitles} />} />
        <Route path="/titles/:tokenId" element={<TitleDetailsPage />} />
        <Route path="/lookup" element={<LookupPage />} />
        <Route path="/digitize" element={<DigitizeLegacyPage walletProvider={walletProvider} canUse={roles.registrar} />} />
        <Route path="/mint-new" element={<MintNewVehiclePage walletProvider={walletProvider} canUse={roles.manufacturer} />} />
        <Route path="/transfer" element={<TransferTitlePage walletProvider={walletProvider} connected={isConnected} />} />
        <Route path="/dealer-transfer" element={<DealerTransferPage walletProvider={walletProvider} canUse={roles.dealer} />} />
        <Route path="/record-controls" element={<RecordControlsPage walletProvider={walletProvider} canUse={roles.regulator || roles.registrar} />} />
        <Route path="/admin/roles" element={<RoleManagementPage walletProvider={walletProvider} canUse={roles.admin} />} />
        <Route
          path="*"
          element={
            <Stack spacing={1}>
              <Typography variant="h4">Page not found</Typography>
              <Typography color="text.secondary">Choose a page from the navbar menu.</Typography>
            </Stack>
          }
        />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <RoutedApp />
    </BrowserRouter>
  )
}
