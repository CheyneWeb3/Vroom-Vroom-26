// src/config/wagmi.ts
import { createConfig, http } from 'wagmi'
import { avalancheFuji } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'
import { QueryClient } from '@tanstack/react-query'

const projectId = import.meta.env.VITE_PROJECT_ID

if (!projectId) {
  console.error('Missing VITE_PROJECT_ID in .env – wallet connect will fail')
}

export const config = createConfig({
  chains: [avalancheFuji],
  transports: {
    [avalancheFuji.id]: http('https://api.avax-test.network/ext/bc/C/rpc'),
  },
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
})

export const queryClient = new QueryClient()