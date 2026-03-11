import { BrowserProvider, Contract, Interface, JsonRpcProvider, getAddress } from 'ethers'
import abiJson from '../abi/VehicleTitleRegistryAbi.json'
import { CHAIN_INFO, CONTRACT_ADDRESS, DEFAULT_CHAIN_ID } from '../config'
import type { NoteItem, OwnedTitle, RoleMap, VehicleRecord } from '../types'
import { aggregate3, decodeResult } from './multicall'

const ABI = abiJson as any
const IFACE = new Interface(ABI)

export function getReadProvider() {
  return new JsonRpcProvider(CHAIN_INFO[DEFAULT_CHAIN_ID].rpc)
}

export function getReadContract(provider = getReadProvider()) {
  return new Contract(CONTRACT_ADDRESS, ABI, provider)
}

export async function getWalletBrowserProvider(walletProvider: unknown) {
  return new BrowserProvider(walletProvider as any)
}

export async function getWriteContract(walletProvider: unknown) {
  const provider = await getWalletBrowserProvider(walletProvider)
  const signer = await provider.getSigner()
  return new Contract(CONTRACT_ADDRESS, ABI, signer)
}

/**
 * Simulate a write method first so contract reverts surface before the wallet send.
 */
export async function simulateWrite(
  walletProvider: unknown,
  method: string,
  args: any[]
) {
  const contract = await getWriteContract(walletProvider)
  const fn = (contract as any)[method]

  if (!fn) {
    throw new Error(`Contract method not found: ${method}`)
  }

  if (typeof fn.staticCall === 'function') {
    await fn.staticCall(...args)
  }

  return contract
}

/**
 * DO NOT multicall roles.
 * This path is tiny and should stay direct + reliable.
 */
export async function getRoleMap(address: string): Promise<RoleMap> {
  const account = getAddress(address)
  const contract = getReadContract()

  const [adminRole, registrarRole, manufacturerRole, dealerRole, regulatorRole] = await Promise.all([
    contract.DEFAULT_ADMIN_ROLE(),
    contract.REGISTRAR_ROLE(),
    contract.MANUFACTURER_ROLE(),
    contract.DEALER_ROLE(),
    contract.REGULATOR_ROLE()
  ])

  const [admin, registrar, manufacturer, dealer, regulator] = await Promise.all([
    contract.hasRole(adminRole, account),
    contract.hasRole(registrarRole, account),
    contract.hasRole(manufacturerRole, account),
    contract.hasRole(dealerRole, account),
    contract.hasRole(regulatorRole, account)
  ])

  return {
    admin: Boolean(admin),
    registrar: Boolean(registrar),
    manufacturer: Boolean(manufacturer),
    dealer: Boolean(dealer),
    regulator: Boolean(regulator)
  }
}

export async function readVehicleRecord(tokenId: bigint | number) {
  const contract = getReadContract()
  return (await contract.getVehicleRecord(tokenId)) as VehicleRecord
}

export async function readTokenURI(tokenId: bigint | number) {
  const contract = getReadContract()
  return String(await contract.tokenURI(tokenId))
}

export async function readNotes(tokenId: bigint | number) {
  const contract = getReadContract()
  return (await contract.getAllNotes(tokenId)) as NoteItem[]
}

export async function readOwner(tokenId: bigint | number) {
  const contract = getReadContract()
  return String(await contract.ownerOf(tokenId))
}

export async function readTitle(tokenId: bigint | number): Promise<OwnedTitle> {
  const items = await readTitlesBatch([BigInt(tokenId)])
  if (!items.length) {
    throw new Error(`Unable to read title ${tokenId.toString()}`)
  }
  return items[0]
}

export async function readTitlesBatch(tokenIds: Array<bigint | number>): Promise<OwnedTitle[]> {
  if (!tokenIds.length) return []

  const normalizedIds = tokenIds.map((v) => BigInt(v))

  const calls = normalizedIds.flatMap((tokenId) => [
    {
      target: CONTRACT_ADDRESS,
      allowFailure: true,
      callData: IFACE.encodeFunctionData('ownerOf', [tokenId])
    },
    {
      target: CONTRACT_ADDRESS,
      allowFailure: true,
      callData: IFACE.encodeFunctionData('getVehicleRecord', [tokenId])
    },
    {
      target: CONTRACT_ADDRESS,
      allowFailure: true,
      callData: IFACE.encodeFunctionData('tokenURI', [tokenId])
    }
  ])

  const results = await aggregate3(calls)
  const titles: OwnedTitle[] = []

  for (let i = 0; i < normalizedIds.length; i++) {
    const ownerResult = results[i * 3]
    const recordResult = results[i * 3 + 1]
    const tokenUriResult = results[i * 3 + 2]

    if (!ownerResult?.success || !recordResult?.success || !tokenUriResult?.success) {
      continue
    }

    const owner = decodeResult<string>(IFACE, 'ownerOf', ownerResult)
    const record = decodeResult<VehicleRecord>(IFACE, 'getVehicleRecord', recordResult)
    const tokenURI = decodeResult<string>(IFACE, 'tokenURI', tokenUriResult)

    titles.push({
      tokenId: normalizedIds[i],
      owner,
      tokenURI,
      record
    })
  }

  return titles
}
