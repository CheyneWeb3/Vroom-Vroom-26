export type RoleMap = {
  admin: boolean
  registrar: boolean
  manufacturer: boolean
  dealer: boolean
  regulator: boolean
}

export type VehicleRecord = {
  vin: string
  make: string
  model: string
  year: bigint
  mileage: bigint
  qrCodeData: string
  brand: number
  state: number
  legacyDigitized: boolean
  createdAt: bigint
  updatedAt: bigint
}

export type NoteItem = {
  index: bigint
  timestamp: bigint
  author: string
  official: boolean
  text: string
}

export type OwnedTitle = {
  tokenId: bigint
  owner: string
  tokenURI: string
  record: VehicleRecord
}
