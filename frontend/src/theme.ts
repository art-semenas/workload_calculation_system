import { createTheme } from '@mui/material/styles'

export const tokens = {
  // Surfaces
  bg: '#f6f6f4',
  bgElev: '#ffffff',
  bgSunken: '#efeeea',

  // Lines
  line: '#e4e2dc',
  lineStrong: '#d4d1c9',

  // Ink
  ink: '#1a1a1a',
  ink2: '#3d3d3a',
  ink3: '#6b6a64',
  ink4: '#9a988f',

  // Accent
  accent: '#3a4fcf',
  accentSoft: '#e8ebff',
  accentInk: '#1a2a8a',

  // States
  ok: '#2d7a4a',
  okSoft: '#e3f1e6',
  warn: '#a66600',
  warnSoft: '#fbedd2',
  danger: '#b23a3a',
  dangerSoft: '#fbe5e0',
}

export const theme = createTheme({
  palette: {
    background: {
      default: tokens.bg,
      paper: tokens.bgElev,
    },
    text: {
      primary: tokens.ink,
      secondary: tokens.ink3,
    },
    divider: tokens.line,
    primary: {
      main: tokens.ink,
    },
    success: {
      main: tokens.ok,
    },
    warning: {
      main: tokens.warn,
    },
    error: {
      main: tokens.danger,
    },
  },

  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontWeightRegular: 450,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: {
      fontSize: 28,
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: 24,
      fontWeight: 600,
      letterSpacing: '-0.015em',
    },
    h3: {
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    body1: {
      fontSize: 14,
      fontWeight: 450,
    },
    body2: {
      fontSize: 13,
      fontWeight: 450,
    },
    caption: {
      fontSize: 12,
      fontWeight: 400,
    },
  },

  shape: {
    borderRadius: 6,
  },

  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          height: 32,
          fontSize: 13,
          paddingLeft: 12,
          paddingRight: 12,
        },
        outlined: {
          borderColor: tokens.lineStrong,
          '&:hover': {
            borderColor: tokens.ink4,
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '14px 12px',
          borderColor: tokens.line,
        },
        head: {
          textTransform: 'uppercase',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: tokens.ink3,
          padding: '10px 12px',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          height: 52,
          '&:hover td': {
            backgroundColor: 'rgba(0,0,0,0.012)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 500,
          height: 22,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          height: 32,
          fontSize: 13,
          '& fieldset': {
            borderColor: tokens.lineStrong,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          '& .MuiOutlinedInput-root': {
            height: 38,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          width: 380,
          borderLeft: `1px solid ${tokens.line}`,
          boxShadow: 'none',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: tokens.bg,
        },
      },
    },
  },
})
