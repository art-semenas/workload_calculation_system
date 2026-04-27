import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { SearchOutlined, NotificationsOutlined } from '@mui/icons-material'
import { useAuthStore } from '../../store/authStore'

const NAV_WIDTH = 240

const workspaceItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Summary', path: '/svod', badge: 'objects' },
  { label: 'Objects', path: '/objects', badge: 'objects' },
  { label: 'Engineers', path: '/engineers', badge: 'engineers' },
  { label: 'Divisions', path: '/divisions' },
]

const administrationItems = [
  { label: 'Device catalog', path: '/admin/catalog', disabled: true },
  { label: 'Repair types', path: '/admin/repairs', disabled: true },
  { label: 'Settings', path: '/admin/settings', disabled: true },
]

function BreadcrumbNav() {
  const location = useLocation()

  const breadcrumbMap: Record<string, string[]> = {
    '/': ['Dashboard'],
    '/objects': ['Objects'],
    '/objects/new': ['Objects', 'Create'],
    '/svod': ['Summary'],
    '/engineers': ['Engineers'],
    '/divisions': ['Divisions'],
  }

  // Try to match exact path, then prefix match
  let breadcrumbs = breadcrumbMap[location.pathname]
  if (!breadcrumbs) {
    const matchedKey = Object.keys(breadcrumbMap).find((key) => location.pathname.startsWith(key))
    breadcrumbs = matchedKey ? breadcrumbMap[matchedKey] : ['Dashboard']
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        color: (theme) => theme.palette.secondary.main,
      }}
    >
      {breadcrumbs.map((crumb, idx) => (
        <Box key={crumb} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {idx > 0 && (
            <Typography sx={{ fontSize: '13px', color: (theme) => theme.palette.divider }}>
              ·
            </Typography>
          )}
          <Typography
            sx={{
              fontSize: '13px',
              fontWeight: idx === breadcrumbs.length - 1 ? 500 : 400,
              color: (theme) =>
                idx === breadcrumbs.length - 1
                  ? theme.palette.secondary.main
                  : theme.palette.secondary.light,
            }}
          >
            {crumb}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

function NavItem({
  label,
  path,
  disabled,
  badge,
}: {
  label: string
  path: string
  disabled?: boolean
  badge?: string
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = location.pathname === path

  // Get badge count - for now hardcode for PoC
  let badgeCount = ''
  if (badge === 'objects') {
    badgeCount = '2 935'
  } else if (badge === 'engineers') {
    badgeCount = '—'
  }

  const content = (
    <Box
      onClick={() => {
        if (!disabled) void navigate(path)
      }}
      sx={{
        padding: '8px 12px',
        marginX: 1,
        marginY: 0.5,
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: isActive ? (theme) => theme.palette.secondary.main : 'transparent',
        color: isActive ? 'white' : 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color 0.2s',
        '&:hover': {
          backgroundColor: disabled
            ? 'transparent'
            : isActive
              ? (theme) => theme.palette.secondary.main
              : '#efeeea',
        },
      }}
    >
      <Typography
        sx={{
          fontSize: '13px',
          fontWeight: isActive ? 500 : 400,
        }}
      >
        {label}
      </Typography>
      {badgeCount && (
        <Chip
          label={badgeCount}
          size="small"
          sx={{
            height: '20px',
            fontSize: '11px',
            backgroundColor: isActive ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
            color: isActive ? 'white' : 'inherit',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        />
      )}
    </Box>
  )

  return disabled ? (
    <Tooltip key={path} title="Available in the next version" placement="right">
      <Box>{content}</Box>
    </Tooltip>
  ) : (
    <Box key={path}>{content}</Box>
  )
}

function UserChip() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  const initials =
    user?.name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase() ?? 'U'

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: '12px',
        cursor: 'pointer',
        '&:hover': { backgroundColor: '#efeeea' },
        borderRadius: '6px',
        marginX: 1,
      }}
    >
      <Avatar
        sx={{
          width: 28,
          height: 28,
          backgroundColor: '#e8ebff',
          color: '#1a2a8a',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        {initials}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{ fontSize: '13px', fontWeight: 500, color: (theme) => theme.palette.secondary.main }}
        >
          {user?.name || 'User'}
        </Typography>
        <Typography sx={{ fontSize: '11px', color: (theme) => theme.palette.secondary.light }}>
          {user?.role || 'Engineer'}
        </Typography>
      </Box>
      <Button
        variant="text"
        size="small"
        onClick={() => {
          logout()
          void navigate('/login')
        }}
        sx={{
          textTransform: 'none',
          fontSize: '11px',
          color: (theme) => theme.palette.secondary.light,
          '&:hover': { color: (theme) => theme.palette.secondary.main },
        }}
      >
        Log out
      </Button>
    </Box>
  )
}

export default function AppLayout() {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: NAV_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: NAV_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: (theme) => theme.palette.background.paper,
            borderRight: (theme) => `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Brand row */}
        <Box
          sx={{
            padding: '16px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={{
              width: 28,
              height: 28,
              backgroundColor: (theme) => theme.palette.secondary.main,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            W
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 500,
                color: (theme) => theme.palette.secondary.main,
              }}
            >
              Workload
            </Typography>
            <Typography sx={{ fontSize: '11px', color: (theme) => theme.palette.secondary.light }}>
              Calculator · v2.24
            </Typography>
          </Box>
        </Box>

        {/* Navigation content */}
        <Box sx={{ flex: 1, overflow: 'auto', paddingY: 2 }}>
          {/* Workspace section */}
          <Typography
            sx={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: (theme) => theme.palette.secondary.light,
              paddingX: 2,
              marginBottom: 1,
            }}
          >
            Workspace
          </Typography>
          {workspaceItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}

          {/* Administration section */}
          <Typography
            sx={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: (theme) => theme.palette.secondary.light,
              paddingX: 2,
              marginTop: 3,
              marginBottom: 1,
            }}
          >
            Administration
          </Typography>
          {administrationItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </Box>

        {/* User chip at bottom */}
        <Box sx={{ borderTop: (theme) => `1px solid ${theme.palette.divider}`, padding: '12px 0' }}>
          <UserChip />
        </Box>
      </Drawer>

      {/* Main content area */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* Topbar */}
        <AppBar
          position="static"
          elevation={0}
          sx={{
            backgroundColor: (theme) => theme.palette.background.paper,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            color: (theme) => theme.palette.secondary.main,
            height: '56px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Toolbar
            sx={{
              minHeight: '56px',
              height: '56px',
              paddingX: 3,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* Breadcrumbs */}
            <BreadcrumbNav />

            {/* Right section: Period pill + buttons */}
            <Stack direction="row" spacing={2} alignItems="center">
              {/* Period pill */}
              <Chip
                label="Planning period H1 2026 · Jan – Jun"
                icon={
                  <Box
                    sx={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: (theme) => theme.palette.success.main,
                    }}
                  />
                }
                size="small"
                sx={{
                  backgroundColor: '#efeeea',
                  color: (theme) => theme.palette.secondary.main,
                  fontSize: '12px',
                  fontWeight: 400,
                  border: 'none',
                  '& .MuiChip-icon': {
                    marginLeft: 1,
                    marginRight: -0.5,
                  },
                }}
              />

              {/* Search button */}
              <IconButton
                size="small"
                sx={{
                  color: (theme) => theme.palette.secondary.light,
                  '&:hover': { backgroundColor: '#efeeea' },
                }}
              >
                <SearchOutlined sx={{ fontSize: '18px' }} />
              </IconButton>

              {/* Notifications button */}
              <IconButton
                size="small"
                sx={{
                  color: (theme) => theme.palette.secondary.light,
                  '&:hover': { backgroundColor: '#efeeea' },
                  position: 'relative',
                }}
              >
                <NotificationsOutlined sx={{ fontSize: '18px' }} />
                {/* Red dot would go here if there were notifications */}
              </IconButton>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Main content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: (theme) => theme.palette.background.default,
            padding: 3,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
