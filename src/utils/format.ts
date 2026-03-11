import { RECORD_STATES, TITLE_BRANDS } from '../config'

export function shortAddress(value?: string) {
  if (!value) return ''
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

export function formatBigint(value?: bigint | number | string) {
  if (value === undefined || value === null) return '0'
  return BigInt(value).toString()
}

export function formatDate(value?: bigint | number | string) {
  if (value === undefined || value === null) return '—'
  const ms = Number(BigInt(value)) * 1000
  return new Date(ms).toLocaleString()
}

export function titleBrandLabel(index: number) {
  return TITLE_BRANDS[index] ?? `Brand ${index}`
}

export function recordStateLabel(index: number) {
  return RECORD_STATES[index] ?? `State ${index}`
}

export function maybeHttp(uri: string) {
  if (!uri) return uri
  if (uri.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${uri.replace('ipfs://', '')}`
  }
  return uri
}
