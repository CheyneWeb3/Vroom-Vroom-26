import { createAppKit } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { APP_NAME, APP_SUBTITLE, APP_URL } from './config'

const FALLBACK_LOCALHOST_PROJECT_ID = 'b56e18d47c72ab683b10814fe9495694'

export const projectId =
  import.meta.env.VITE_REOWN_PROJECT_ID?.trim() || FALLBACK_LOCALHOST_PROJECT_ID

const metadata = {
  name: APP_NAME,
  description: APP_SUBTITLE,
  url: APP_URL,
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

const avalancheFuji = {
  id: 43113,
  chainId: 43113,
  name: 'Avalanche Fuji',
  network: 'avalanche-fuji',
  nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
  rpcUrls: { default: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] } },
  blockExplorers: { default: { name: 'Snowtrace (Testnet)', url: 'https://testnet.snowtrace.io' } }
} as const

const avalancheMainnet = {
  id: 43114,
  chainId: 43114,
  name: 'Avalanche C-Chain',
  network: 'avalanche',
  nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
  rpcUrls: { default: { http: ['https://api.avax.network/ext/bc/C/rpc'] } },
  blockExplorers: { default: { name: 'Snowtrace', url: 'https://snowtrace.io' } }
} as const

export const networks = [avalancheFuji, avalancheMainnet]

export const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  networks: networks as any,
  projectId,
  metadata,
  featuredWalletIds: ['f323633c1f67055a45aac84e321af6ffe46322da677ffdd32f9bc1e33bafe29c'],
  features: { analytics: true }
})
