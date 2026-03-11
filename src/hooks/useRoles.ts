import { useEffect, useState } from 'react'
import type { RoleMap } from '../types'
import { getRoleMap } from '../lib/contract'

const emptyRoles: RoleMap = {
  admin: false,
  registrar: false,
  manufacturer: false,
  dealer: false,
  regulator: false
}

export function useRoles(address?: string) {
  const [roles, setRoles] = useState<RoleMap>(emptyRoles)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!address) {
        setRoles(emptyRoles)
        return
      }

      setLoading(true)

      try {
        const next = await getRoleMap(address)
        if (!cancelled) setRoles(next)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [address])

  return { roles, loading }
}
