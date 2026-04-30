import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Avatar, Box, Typography } from '@mui/material'
import { useAuthStore } from '../../store/authStore'
import { tokens } from '../../theme'

const NAV_WIDTH = 200

interface NavItem {
  label: string
  path: string
}

interface NavSection {
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/' },
      { label: 'Summary', path: '/svod' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Objects', path: '/objects' },
      { label: 'Engineers', path: '/engineers' },
    ],
  },
  {
    label: 'Reference',
    items: [{ label: 'Divisions', path: '/divisions' }],
  },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function AppLayout() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: NAV_WIDTH,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: tokens.bg,
          borderRight: `1px solid ${tokens.line}`,
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* Brand */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: '10px',
            pt: '20px',
            pb: '16px',
          }}
        >
          <Box
            sx={{
              width: 22,
              height: 22,
              background: tokens.ink,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: '4px',
              flexShrink: 0,
            }}
          >
            W
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.ink, lineHeight: 1 }}>
            Workload
          </Typography>
        </Box>

        {/* Nav sections */}
        <Box sx={{ flex: 1 }}>
          {navSections.map((section) => (
            <Box key={section.label} sx={{ mb: '28px' }}>
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: tokens.ink4,
                  px: '10px',
                  mb: '4px',
                }}
              >
                {section.label}
              </Typography>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  style={({ isActive }) => ({
                    display: 'block',
                    padding: '6px 10px',
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? tokens.ink : tokens.ink3,
                    borderLeft: `2px solid ${isActive ? tokens.ink : 'transparent'}`,
                    textDecoration: 'none',
                    lineHeight: 1.4,
                  })}
                >
                  {item.label}
                </NavLink>
              ))}
            </Box>
          ))}
        </Box>

        {/* User chip */}
        <Box
          sx={{
            p: '12px 10px',
            borderTop: `1px solid ${tokens.line}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: '6px' }}>
            <Avatar
              sx={{
                width: 24,
                height: 24,
                fontSize: 10,
                fontWeight: 500,
                bgcolor: tokens.ink4,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {user ? getInitials(user.name) : '?'}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: tokens.ink,
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.name ?? '—'}
              </Typography>
              <Typography sx={{ fontSize: 11, color: tokens.ink3, lineHeight: 1.3 }}>
                {user?.role ?? '—'}
              </Typography>
            </Box>
          </Box>
          <Box
            component="button"
            onClick={() => {
              logout()
              void navigate('/login')
            }}
            sx={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              color: tokens.ink4,
              p: 0,
              '&:hover': { color: tokens.ink3 },
            }}
          >
            Logout
          </Box>
        </Box>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: `${NAV_WIDTH}px`,
          minWidth: 0,
          minHeight: '100vh',
          background: tokens.bg,
          p: 3,
          overflow: 'hidden',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
