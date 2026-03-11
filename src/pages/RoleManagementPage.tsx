import { Button, CircularProgress, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { Page } from '../components/Page'
import { FormStatus } from '../components/FormStatus'
import { getRoleMap, getWriteContract, simulateWrite } from '../lib/contract'
import type { RoleMap } from '../types'
import { RoleBadges } from '../components/RoleBadges'
import { extractErrorMessage } from '../utils/extractError'
import { useWalletState } from '../hooks/useWalletState'
import { useRoles } from '../hooks/useRoles'

const emptyRoles: RoleMap = {
  admin: false,
  registrar: false,
  manufacturer: false,
  dealer: false,
  regulator: false
}

export function RoleManagementPage({ walletProvider }: { walletProvider?: unknown; canUse: boolean }) {
  const { address } = useWalletState()
  const { roles: myRoles, loading: rolesLoading } = useRoles(address)

  const [target, setTarget] = useState('')
  const [role, setRole] = useState('registrar')
  const [queriedRoles, setQueriedRoles] = useState<RoleMap>(emptyRoles)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function inspect() {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const next = await getRoleMap(target.trim())
      setQueriedRoles(next)
      setSuccess('Role status loaded.')
    } catch (e: any) {
      console.error('role inspect failed:', e)
      setError(extractErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function mutate(kind: 'grant' | 'revoke') {
    if (!walletProvider) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const fnName = `${kind}${role.charAt(0).toUpperCase()}${role.slice(1)}Role`
      await simulateWrite(walletProvider, fnName, [target.trim()])
      const contract = await getWriteContract(walletProvider)
      const tx = await (contract as any)[fnName](target.trim())
      const receipt = await tx.wait()

      setSuccess(`${kind === 'grant' ? 'Granted' : 'Revoked'} ${role} role. Tx: ${receipt?.hash ?? tx.hash}`)

      const next = await getRoleMap(target.trim())
      setQueriedRoles(next)
    } catch (e: any) {
      console.error('role mutate failed:', e)
      setError(extractErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const canUse = myRoles.admin

  return (
    <Page
      title="Role Management"
      subtitle="Administration page for contract owner / admin role assignment."
      warning={
        rolesLoading
          ? null
          : !canUse
            ? 'This page requires DEFAULT_ADMIN_ROLE.'
            : null
      }
    >
      <Stack spacing={2}>
        <Stack spacing={1}>
          <Typography variant="h6">Connected account access</Typography>
          {rolesLoading ? <CircularProgress size={20} /> : <RoleBadges roles={myRoles} />}
        </Stack>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
            <TextField
              label="Target wallet address"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <TextField select label="Role" value={role} onChange={(e) => setRole(e.target.value)} fullWidth>
              {['registrar', 'manufacturer', 'dealer', 'regulator'].map((item) => (
                <MenuItem key={item} value={item}>{item}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <Button variant="outlined" onClick={() => void inspect()} disabled={!target || loading}>
            Check Roles
          </Button>
          <Button variant="contained" onClick={() => void mutate('grant')} disabled={!walletProvider || !canUse || !target || loading || rolesLoading}>
            Grant Role
          </Button>
          <Button variant="outlined" color="warning" onClick={() => void mutate('revoke')} disabled={!walletProvider || !canUse || !target || loading || rolesLoading}>
            Revoke Role
          </Button>
        </Stack>

        <Typography variant="h6">Queried role status</Typography>
        <RoleBadges roles={queriedRoles} />

        <FormStatus loading={loading} error={error} success={success} />
      </Stack>
    </Page>
  )
}
