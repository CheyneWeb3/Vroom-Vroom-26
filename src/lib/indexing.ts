import { getAddress } from 'ethers'
import {
  CONTRACT_DEPLOY_BLOCK,
  FALLBACK_LOOKBACK_BLOCKS,
  LOG_CHUNK_SIZE
} from '../config'
import { getReadContract, getReadProvider } from './contract'

function uniqueSortedBigints(values: bigint[]) {
  return [...new Set(values.map((v) => v.toString()))]
    .map((v) => BigInt(v))
    .sort((a, b) => (a > b ? 1 : a < b ? -1 : 0))
}

async function getSafeStartBlock() {
  const provider = getReadProvider()
  const latest = await provider.getBlockNumber()

  if (CONTRACT_DEPLOY_BLOCK > 0) {
    return Math.min(CONTRACT_DEPLOY_BLOCK, latest)
  }

  return Math.max(0, latest - FALLBACK_LOOKBACK_BLOCKS)
}

async function queryEventsChunked(filter: any) {
  const contract = getReadContract()
  const provider = getReadProvider()

  const latest = await provider.getBlockNumber()
  const start = await getSafeStartBlock()

  const allEvents: any[] = []

  for (let fromBlock = start; fromBlock <= latest; fromBlock += LOG_CHUNK_SIZE + 1) {
    const toBlock = Math.min(fromBlock + LOG_CHUNK_SIZE, latest)

    try {
      const chunk = await contract.queryFilter(filter, fromBlock, toBlock)
      allEvents.push(...chunk)
    } catch (error) {
      console.error(`Event chunk query failed [${fromBlock}-${toBlock}]`, error)
    }
  }

  return allEvents
}

export async function getOwnedTokenIds(owner: string): Promise<bigint[]> {
  const normalized = getAddress(owner)
  const contract = getReadContract()

  const transferFilter = contract.filters.Transfer()
  const events = await queryEventsChunked(transferFilter)

  const owned = new Set<string>()

  for (const ev of events as any[]) {
    const from = String(ev.args?.from ?? ev.args?.[0] ?? '')
    const to = String(ev.args?.to ?? ev.args?.[1] ?? '')
    const tokenId = BigInt(String(ev.args?.tokenId ?? ev.args?.[2] ?? '0'))

    if (to.toLowerCase() === normalized.toLowerCase()) {
      owned.add(tokenId.toString())
    }

    if (from.toLowerCase() === normalized.toLowerCase()) {
      owned.delete(tokenId.toString())
    }
  }

  return uniqueSortedBigints([...owned].map((v) => BigInt(v)))
}

export async function getRecentMintedTokenIds(limit = 12): Promise<bigint[]> {
  const contract = getReadContract()

  let events: any[] = []

  try {
    const titleMintedFilter = contract.filters.TitleMinted()
    events = await queryEventsChunked(titleMintedFilter)
  } catch (error) {
    console.error('TitleMinted event query failed, falling back to Transfer mint events', error)
  }

  if (!events.length) {
    const transferEvents = await queryEventsChunked(contract.filters.Transfer())

    const mintIds = transferEvents
      .filter((ev: any) => {
        const from = String(ev.args?.from ?? ev.args?.[0] ?? '')
        return from === '0x0000000000000000000000000000000000000000'
      })
      .map((ev: any) => BigInt(String(ev.args?.tokenId ?? ev.args?.[2] ?? '0')))
      .filter((v: bigint) => v > 0n)

    return uniqueSortedBigints(mintIds).slice(-limit).reverse()
  }

  return events
    .map((ev: any) => BigInt(String(ev.args?.tokenId ?? ev.args?.[0] ?? '0')))
    .filter((v: bigint) => v > 0n)
    .slice(-limit)
    .reverse()
}
