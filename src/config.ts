export const APP_NAME = 'VTitle Registry'
export const APP_SUBTITLE = 'Digital vehicle title registry for Avalanche Fuji'
export const DEFAULT_CHAIN_ID = 43113

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS?.trim()

if (!contractAddress) {
  throw new Error('Missing VITE_CONTRACT_ADDRESS in .env')
}

export const CONTRACT_ADDRESS = contractAddress

export const CONTRACT_DEPLOY_BLOCK = Number(
  import.meta.env.VITE_CONTRACT_DEPLOY_BLOCK ?? 52595336
)

export const MULTICALL3_ADDRESS =
  import.meta.env.VITE_MULTICALL3_ADDRESS?.trim() ||
  '0xcA11bde05977b3631167028862bE2a173976CA11'

export const FALLBACK_LOOKBACK_BLOCKS = Number(
  import.meta.env.VITE_LOOKBACK_BLOCKS ?? 120000
)

export const LOG_CHUNK_SIZE = Number(
  import.meta.env.VITE_LOG_CHUNK_SIZE ?? 1500
)

export const APP_URL =
  import.meta.env.VITE_APP_URL?.trim() ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')

export const CHAIN_INFO: Record<
  number,
  { name: string; hex: string; explorer: string; rpc: string }
> = {
  43113: {
    name: 'Avalanche Fuji',
    hex: '0xa869',
    explorer: 'https://testnet.snowtrace.io',
    rpc: 'https://api.avax-test.network/ext/bc/C/rpc'
  },
  43114: {
    name: 'Avalanche C-Chain',
    hex: '0xa86a',
    explorer: 'https://snowtrace.io',
    rpc: 'https://api.avax.network/ext/bc/C/rpc'
  }
}

export const TITLE_BRANDS: readonly string[] = [
  'Clean',
  'Salvage',
  'Rebuilt',
  'Lien',
  'Odometer discrepancy',
  'Flood',
  'Other'
]

export const RECORD_STATES: readonly string[] = [
  'Active',
  'Frozen',
  'Revoked'
]
