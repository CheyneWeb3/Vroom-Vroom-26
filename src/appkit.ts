// src/config/appkit.ts (or wherever this file lives)
import { createAppKit } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
console.log('Loaded Project ID:', import.meta.env.VITE_PROJECT_ID);
// Reown Dashboard Project ID
// Use your real ID from cloud.walletconnect.com (do NOT use fallback in production)
const projectId = import.meta.env.VITE_PROJECT_ID?.trim()

if (!projectId) {
  console.error('Missing VITE_PROJECT_ID in .env — wallet connect will not work')
  // Do NOT use fallback ID in real apps — it will fail on Reown servers
}

const metadata = {
  name: 'Vehicle Title Registry',
  description: 'Digitize vehicle titles on Avalanche Fuji',
  url: import.meta.env.VITE_APP_URL?.trim() || 'http://localhost:5173',
  icons: ['https://your-icon-url.com/icon.png'] // optional — can be empty []
}

// Initialize Reown AppKit (no 'networks' or 'chains' here — that's in wagmi config)
export const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  projectId,
  metadata,
  networks: [
    {
      id: 43113,  // Fuji chain ID
      name: 'Avalanche Fuji',
   
      nativeCurrency: {
        name: 'Avalanche',
        symbol: 'AVAX',
        decimals: 18,
      },
      rpcUrls: {
        default: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] },
        public: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] },
      },
      blockExplorers: {
        default: { name: 'Routescan', url: 'https://testnet.routescan.io' },
      },
      testnet: true,
    }
  ],
  features: {
    analytics: true,
    email: true,
    socials: false,  // or ['google', 'apple'] if you want them
  }
})