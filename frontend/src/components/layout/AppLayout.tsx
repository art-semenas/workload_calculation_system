import { Outlet, useNavigate } from 'react-router-dom'
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
} from '@mui/material'
import { useAuthStore } from '../../store/authStore'

const NAV_WIDTH = 220

const navItems = [
  { label: 'Дашборд', path: '/' },
  { label: 'Объекты', path: '/objects' },
  { label: 'Инженеры', path: '/engineers' },
  { label: 'СВОД', path: '/svod' },
  { label: 'Подразделения', path: '/divisions' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6">Workload Calculator</Typography>
          <ListItemButton
            onClick={() => {
              logout()
              void navigate('/login')
            }}
            sx={{ width: 'auto', color: 'white' }}
          >
            Выйти
          </ListItemButton>
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
          {navItems.map((item) => (
            <ListItemButton key={item.path} onClick={() => void navigate(item.path)}>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: `${NAV_WIDTH}px` }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
