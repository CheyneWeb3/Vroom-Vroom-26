import { useAppKit, useAppKitAccount, useAppKitProvider, useDisconnect } from '@reown/appkit/react'
import { BrowserProvider } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CHAIN_INFO, DEFAULT_CHAIN_ID } from '../config'

export function useWalletState() {
  const { open } = useAppKit()
  const { disconnect: appkitDisconnect } = useDisconnect()
  const { address, isConnected, status } = useAppKitAccount({ namespace: 'eip155' })
  const { walletProvider } = useAppKitProvider('eip155')
  const [chainId, setChainId] = useState<number | null>(null)

  const refreshChain = useCallback(async () => {
    if (!walletProvider) {
      setChainId(null)
      return
    }

    const provider = new BrowserProvider(walletProvider as any)
    const network = await provider.getNetwork()
    setChainId(Number(network.chainId))
  }, [walletProvider])

  useEffect(() => {
    void refreshChain()
  }, [refreshChain])

  const wrongNetwork = useMemo(
    () => Boolean(isConnected && chainId !== null && chainId !== DEFAULT_CHAIN_ID),
    [chainId, isConnected]
  )

  const switchToDefaultChain = useCallback(async () => {
    if (!(walletProvider as any)?.request) return

    await (walletProvider as any).request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_INFO[DEFAULT_CHAIN_ID].hex }]
    })

    await refreshChain()
  }, [refreshChain, walletProvider])

  const disconnect = useCallback(async () => {
    try {
      await appkitDisconnect()
    } catch {
      // swallow wallet_revokePermissions noise from unsupported wallets
    }
  }, [appkitDisconnect])

  return {
    open,
    disconnect,
    address,
    isConnected,
    status,
    walletProvider,
    chainId,
    wrongNetwork,
    switchToDefaultChain,
    refreshChain
  }
}
