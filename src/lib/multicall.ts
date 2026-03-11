import { Contract, Interface } from 'ethers'
import { MULTICALL3_ADDRESS } from '../config'
import { getReadProvider } from './contract'

const MULTICALL3_ABI = [
  'function aggregate3((address target,bool allowFailure,bytes callData)[] calls) payable returns ((bool success,bytes returnData)[] returnData)'
]

export type MulticallInput = {
  target: string
  allowFailure?: boolean
  callData: string
}

export type MulticallResult = {
  success: boolean
  returnData: string
}

export async function aggregate3(calls: MulticallInput[]): Promise<MulticallResult[]> {
  if (!calls.length) return []

  const provider = getReadProvider()
  const multicall = new Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, provider)

  const formatted = calls.map((call) => ({
    target: call.target,
    allowFailure: call.allowFailure ?? false,
    callData: call.callData
  }))

  const results = await multicall.aggregate3.staticCall(formatted)
  return results as MulticallResult[]
}

export function decodeResult<T = any>(
  iface: Interface,
  fragment: string,
  result: MulticallResult
): T {
  if (!result.success) {
    throw new Error(`Multicall failed for ${fragment}`)
  }

  const decoded = iface.decodeFunctionResult(fragment, result.returnData)
  return decoded[0] as T
}
