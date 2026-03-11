import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography
} from '@mui/material'
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { APP_NAME, CHAIN_INFO, CONTRACT_ADDRESS, DEFAULT_CHAIN_ID } from '../config'
import { shortAddress } from '../utils/format'
import type { RoleMap } from '../types'

type Props = {
  children: React.ReactNode
  address?: string
  isConnected: boolean
  onConnect: () => void
  onDisconnect: () => void
  onAccount: () => void
  roles: RoleMap
}

const directLinks = [
  { label: 'Dashboard', to: '/' },
  { label: 'My Titles', to: '/titles' },
  { label: 'Lookup', to: '/lookup' }
]

export function AppShell({
  children,
  address,
  isConnected,
  onConnect,
  onDisconnect,
  onAccount,
  roles
}: Props) {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [workflowAnchor, setWorkflowAnchor] = useState<null | HTMLElement>(null)
  const [adminAnchor, setAdminAnchor] = useState<null | HTMLElement>(null)

  const workflowItems = [
    { label: 'Digitise Legacy Title', to: '/digitize' },
    { label: 'Mint New Vehicle', to: '/mint-new' },
    { label: 'Transfer Title', to: '/transfer' },
    { label: 'Dealer Transfer', to: '/dealer-transfer' }
  ]

  const adminItems = [
    { label: 'Record Controls', to: '/record-controls' },
    { label: 'Role Management', to: '/admin/roles' }
  ]

  const go = (to: string) => {
    navigate(to)
    setMobileOpen(false)
    setWorkflowAnchor(null)
    setAdminAnchor(null)
  }

  const drawer = (
    <Box sx={{ width: 280 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={900}>{APP_NAME}</Typography>
        <Typography variant="body2" color="text.secondary">
          Avalanche Fuji title registry
        </Typography>
      </Box>
      <Divider />
      <List>
        {directLinks.map((item) => (
          <ListItemButton key={item.to} onClick={() => go(item.to)}>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
        <Divider sx={{ my: 1 }} />
        {workflowItems.map((item) => (
          <ListItemButton key={item.to} onClick={() => go(item.to)}>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
        <Divider sx={{ my: 1 }} />
        {adminItems.map((item) => (
          <ListItemButton key={item.to} onClick={() => go(item.to)}>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          <Button color="inherit" sx={{ display: { md: 'none' } }} onClick={() => setMobileOpen(true)}>
            Menu
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={900}>{APP_NAME}</Typography>

            <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {directLinks.map((item) => (
                <Button key={item.to} component={NavLink} to={item.to} color="inherit">
                  {item.label}
                </Button>
              ))}
              <Button color="inherit" onClick={(e) => setWorkflowAnchor(e.currentTarget)}>
                Workflows ▾
              </Button>
              <Button color="inherit" onClick={(e) => setAdminAnchor(e.currentTarget)}>
                Admin ▾
              </Button>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: 'none', lg: 'flex' } }}>
            <Chip label={CHAIN_INFO[DEFAULT_CHAIN_ID].name} size="small" />
            <Chip label={shortAddress(CONTRACT_ADDRESS)} size="small" variant="outlined" />
            {roles.admin && <Chip label="Admin" size="small" color="primary" />}
            {roles.registrar && <Chip label="Registrar" size="small" color="primary" />}
          </Stack>

          {!isConnected ? (
            <Button variant="contained" onClick={onConnect}>Connect</Button>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={onAccount}>{shortAddress(address)}</Button>
              <Button color="inherit" onClick={onDisconnect}>Disconnect</Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Menu anchorEl={workflowAnchor} open={Boolean(workflowAnchor)} onClose={() => setWorkflowAnchor(null)}>
        {workflowItems.map((item) => (
          <MenuItem key={item.to} onClick={() => go(item.to)}>
            {item.label}
          </MenuItem>
        ))}
      </Menu>

      <Menu anchorEl={adminAnchor} open={Boolean(adminAnchor)} onClose={() => setAdminAnchor(null)}>
        {adminItems.map((item) => (
          <MenuItem key={item.to} onClick={() => go(item.to)}>
            {item.label}
          </MenuItem>
        ))}
      </Menu>

      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
        {drawer}
      </Drawer>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  )
}
