import { createTheme, ThemeOptions } from '@mui/material/styles'

const palette = {
  // Neutrals
  bg: '#f6f6f4',
  bgElev: '#ffffff',
  bgSunken: '#efeeea',
  line: '#e4e2dc',
  lineStrong: '#d4d1c9',
  ink: '#1a1a1a',
  ink2: '#3d3d3a',
  ink3: '#6b6a64',
  ink4: '#9a988f',
  // Accent (indigo)
  accent: '#3a4fcf',
  accentSoft: '#e8ebff',
  accentInk: '#1a2a8a',
  // Status colors
  ok: '#2d7a4a',
  okSoft: '#e3f1e6',
  warn: '#a66600',
  warnSoft: '#fbedd2',
  danger: '#b23a3a',
  dangerSoft: '#fbe5e0',
}

const themeOptions: ThemeOptions = {
  palette: {
    background: {
      default: palette.bg,
      paper: palette.bgElev,
    },
    primary: {
      main: palette.accent,
      light: palette.accentSoft,
      dark: palette.accentInk,
      contrastText: '#ffffff',
    },
    secondary: {
      main: palette.ink,
    },
    success: {
      main: palette.ok,
      light: palette.okSoft,
    },
    warning: {
      main: palette.warn,
      light: palette.warnSoft,
    },
    error: {
      main: palette.danger,
      light: palette.dangerSoft,
    },
    divider: palette.line,
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    h1: {
      fontSize: '28px',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h4: {
      fontSize: '28px',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h6: {
      fontSize: '22px',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    body1: {
      fontSize: '13px',
      fontWeight: 450,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '13px',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    button: {
      fontSize: '13px',
      fontWeight: 500,
      textTransform: 'none',
      letterSpacing: '0em',
    },
    caption: {
      fontSize: '11px',
      fontWeight: 400,
      color: palette.ink3,
    },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '8px 14px',
          fontSize: '13px',
          fontWeight: 500,
          borderRadius: '6px',
          textTransform: 'none',
          border: `1px solid ${palette.lineStrong}`,
          '&:hover': {
            backgroundColor: palette.bgSunken,
          },
        },
        contained: {
          backgroundColor: palette.ink,
          color: palette.bgElev,
          border: `1px solid ${palette.ink}`,
          '&:hover': {
            backgroundColor: palette.ink2,
            borderColor: palette.ink2,
          },
        },
        outlined: {
          borderColor: palette.lineStrong,
          color: palette.ink,
          '&:hover': {
            backgroundColor: palette.bgSunken,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: '11px',
          fontWeight: 500,
          padding: '2px 8px',
          height: 'auto',
          borderRadius: '999px',
          backgroundColor: palette.bgSunken,
          color: palette.ink2,
          border: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: palette.bgElev,
          border: `1px solid ${palette.line}`,
          borderRadius: '10px',
          boxShadow: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: palette.ink3,
          backgroundColor: palette.bgElev,
          borderBottom: `1px solid ${palette.line}`,
          padding: '10px 12px',
        },
        body: {
          fontSize: '13px',
          padding: '12px',
          borderBottom: `1px solid ${palette.line}`,
          color: palette.ink,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#fafaf7',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '13px',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        },
        input: {
          padding: '8px 10px',
          height: '34px',
          boxSizing: 'border-box',
          '&::placeholder': {
            color: palette.ink3,
            opacity: 1,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: palette.bgElev,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.lineStrong,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.lineStrong,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.accent,
            boxShadow: `0 0 0 3px ${palette.accentSoft}`,
          },
        },
        input: {
          color: palette.ink,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: `1px solid ${palette.line}`,
          backgroundColor: palette.bgElev,
          '& .MuiDataGrid-columnHeader': {
            backgroundColor: palette.bgElev,
            color: palette.ink3,
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          },
          '& .MuiDataGrid-cell': {
            borderBottomColor: palette.line,
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#fafaf7',
            cursor: 'pointer',
          },
        },
      },
    },
  },
}

export const theme = createTheme(themeOptions)
