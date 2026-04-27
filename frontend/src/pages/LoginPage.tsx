import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Typography,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { FormTextField } from '../components/common/FormTextField'
import { useLogin } from '../hooks/useAuth'
import { LoginRequestSchema, type LoginRequest } from '../types/auth'

const FONT_MONO = "'JetBrains Mono', 'SF Mono', Menlo, monospace"
const INK = '#1a1a1a'
const INK_3 = '#6b6a64'
const INK_4 = '#9a988f'
const ACCENT = '#3a4fcf'
const LINE = '#e4e2dc'

function isUnauthorizedError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { status?: number } }).response?.status === 'number' &&
    (error as { response?: { status?: number } }).response?.status === 401
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const loginMutation = useLogin()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const { control, handleSubmit, formState } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    setErrorMessage(null)
    try {
      await loginMutation.mutateAsync(data)
      navigate('/')
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        setErrorMessage('Invalid email or password')
        return
      }
      setErrorMessage('Something went wrong. Please try again.')
    }
  })

  const isSubmitting = formState.isSubmitting

  // Design-reference placeholders — replaced with live data in MVP
  const statStrip = [
    { label: 'Objects under maintenance', value: '2 935' },
    { label: 'Required FTE · H1 2026', value: '205.75' },
    { label: 'Active engineers', value: '—' },
  ]

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 520px',
      }}
    >
      {/* Left — brand pane */}
      <Box
        sx={{
          background: INK,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          padding: { xs: '40px 32px', md: '40px 56px' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: { xs: 'auto', md: '100vh' },
        }}
      >
        {/* Dot grid overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            pointerEvents: 'none',
          }}
        />
        {/* Accent blob */}
        <Box
          sx={{
            position: 'absolute',
            right: -160,
            top: -120,
            width: 520,
            height: 520,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, rgba(58,79,207,0.55), transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        {/* Brand row */}
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '9px',
              background: '#fff',
              color: INK,
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontFamily: FONT_MONO,
              fontSize: 16,
            }}
          >
            W
          </Box>
          <Box>
            <Typography
              sx={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em', color: '#fff' }}
            >
              Workload Calculator
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
              Bank · Security systems maintenance
            </Typography>
          </Box>
        </Box>

        {/* Hero content */}
        <Box sx={{ position: 'relative', maxWidth: 460 }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
              mb: '14px',
            }}
          >
            Planning period · H1 2026
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontSize: 44,
              fontWeight: 600,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              m: 0,
              mb: '18px',
              color: '#fff',
            }}
          >
            Calculate maintenance headcount
            <br />
            across{' '}
            <Box component="span" sx={{ color: '#9ab2ff' }}>
              2 935 objects
            </Box>
            .
          </Typography>
          <Typography
            sx={{
              fontSize: 14,
              lineHeight: 1.55,
              color: 'rgba(255,255,255,0.65)',
              m: 0,
              maxWidth: 420,
            }}
          >
            Provides an auditable, deterministic engine. Equipment normatives flow through to FTE
            coefficients automatically.
          </Typography>

          {/* Stat strip */}
          <Box
            sx={{
              mt: '36px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            {statStrip.map((stat) => (
              <Box key={stat.label} sx={{ background: INK, padding: '16px 18px' }}>
                <Typography
                  sx={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  {stat.label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 22,
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    mt: '8px',
                    lineHeight: 1,
                    fontFamily: FONT_MONO,
                    color: '#fff',
                  }}
                >
                  {stat.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Footer row */}
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            color: 'rgba(255,255,255,0.45)',
          }}
        >
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
            v2.24 · build 8f3a-e921
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#4ade80',
                flexShrink: 0,
              }}
            />
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
              All systems operational
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Right — form pane */}
      <Box
        sx={{
          background: '#ffffff',
          padding: { xs: '40px 32px', md: '56px 64px' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: { xs: 'auto', md: '100vh' },
        }}
      >
        <Box sx={{ maxWidth: 360, width: '100%' }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: INK_3,
              mb: '8px',
            }}
          >
            SIGN IN
          </Typography>
          <Typography
            component="h2"
            sx={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', m: '0 0 8px' }}
          >
            Welcome back.
          </Typography>
          <Typography sx={{ fontSize: 13, color: INK_3, m: '0 0 32px' }}>
            Use your corporate credentials to access the workload tool.
          </Typography>

          {errorMessage !== null ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          ) : null}

          <Box
            component="form"
            onSubmit={(e) => {
              void onSubmit(e)
            }}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
          >
            <FormTextField
              name="email"
              control={control}
              label="Email"
              variant="standard"
              fullWidth
              autoComplete="email"
            />
            <Box sx={{ position: 'relative' }}>
              <FormTextField
                name="password"
                control={control}
                label="Password"
                type={showPassword ? 'text' : 'password'}
                variant="standard"
                fullWidth
                autoComplete="current-password"
              />
              <IconButton
                size="small"
                onClick={() => setShowPassword((v) => !v)}
                sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <VisibilityOff fontSize="small" />
                ) : (
                  <Visibility fontSize="small" />
                )}
              </IconButton>
            </Box>
            {/* PoC S-04: uncontrolled — wire to session-duration logic in MVP */}
            <FormControlLabel
              control={<Checkbox size="small" />}
              label="Keep me signed in for 30 days"
              sx={{
                mt: '-4px',
                '& .MuiFormControlLabel-label': {
                  fontSize: 12,
                  color: '#3d3d3a',
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disableRipple
              disabled={isSubmitting}
              sx={{
                padding: '12px 14px',
                fontSize: 14,
                fontWeight: 500,
                minHeight: 44,
                mt: '4px',
              }}
            >
              {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>

          {/* Divider */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              my: '28px',
              color: INK_4,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <Box sx={{ flex: 1, height: '1px', background: LINE }} />
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: INK_4,
              }}
            >
              or
            </Typography>
            <Box sx={{ flex: 1, height: '1px', background: LINE }} />
          </Box>

          {/* SSO button — disabled in PoC */}
          <Button
            fullWidth
            variant="outlined"
            disabled
            startIcon={
              <Box
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: '4px',
                  background: ACCENT,
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                S
              </Box>
            }
            sx={{ padding: '11px 14px', fontSize: 13, justifyContent: 'center', gap: '10px' }}
          >
            Continue with corporate SSO
          </Button>

          <Typography sx={{ mt: '32px', fontSize: 11, color: INK_3, lineHeight: 1.6 }}>
            Trouble signing in? Contact IT Service Desk ext. 4400
          </Typography>

          {/* Footer */}
          <Box
            sx={{
              mt: '48px',
              pt: '20px',
              borderTop: `1px solid ${LINE}`,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: INK_4,
            }}
          >
            <Typography sx={{ fontSize: 11, color: INK_4 }}>© 2026 Bank</Typography>
            <Box sx={{ display: 'flex', gap: '14px' }}>
              {['Privacy', 'Terms', 'Status'].map((item) => (
                <Typography key={item} sx={{ fontSize: 11, color: INK_4 }}>
                  {item}
                </Typography>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
