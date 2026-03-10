// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx' // default home page (balances)
import AddVehicle from './pages/AddVehicle.tsx' // your page
import './index.css' // if you have it

import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '../wagmi'

// Initialize Reown AppKit
createAppKit({
  projectId: import.meta.env.VITE_PROJECT_ID,
  networks: [
    {
      id: 43113,
      name: 'Avalanche Fuji',
      nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
      rpcUrls: { default: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] } },
      blockExplorers: { default: { name: 'Routescan', url: 'https://testnet.routescan.io' } },
      testnet: true,
    }
  ],
  metadata: {
    name: 'Vehicle Title Registry',
    description: 'Digitize vehicle titles on Avalanche',
    url: 'http://localhost:5173',
    icons: []
  },
  features: {
    email: true,
    socials: false,
  },
})

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} /> {/* home - balances */}
            <Route path="/add-vehicle" element={<AddVehicle />} /> {/* your page */}
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)