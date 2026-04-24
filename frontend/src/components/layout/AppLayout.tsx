import { Outlet, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { useAuthStore } from '../../store/authStore'

const NAV_WIDTH = 220

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Objects', path: '/objects' },
  { label: 'Engineers', path: '/engineers', disabled: true },
  { label: 'Summary', path: '/svod' },
  { label: 'Divisions', path: '/divisions' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6">Workload Calculator</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1">{user?.name}</Typography>
            <ListItemButton
              onClick={() => {
                logout()
                void navigate('/login')
              }}
              sx={{ width: 'auto', color: 'white' }}
            >
              Logout
            </ListItemButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: NAV_WIDTH,
          '& .MuiDrawer-paper': { width: NAV_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <List>
          {navItems.map((item) => {
            const content = (
              <ListItemButton
                onClick={() => void navigate(item.path)}
                sx={
                  item.disabled
                    ? {
                        opacity: 0.5,
                        pointerEvents: 'none',
                      }
                    : undefined
                }
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            )

            return item.disabled ? (
              <Tooltip key={item.path} title="Available in the next version" placement="right">
                <Box>{content}</Box>
              </Tooltip>
            ) : (
              <Box key={item.path}>{content}</Box>
            )
          })}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: `${NAV_WIDTH}px` }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
