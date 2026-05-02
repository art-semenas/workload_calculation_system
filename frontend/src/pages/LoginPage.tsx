import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  Typography,
} from '@mui/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { FormTextField } from '../components/common/FormTextField'
import { useLogin } from '../hooks/useAuth'
import { LoginRequestSchema, type LoginRequest } from '../types/auth'
import { tokens } from '../theme'

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
  const [keepSignedIn, setKeepSignedIn] = useState(false)

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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        backgroundColor: tokens.bg,
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 31px, ${tokens.line} 31px, ${tokens.line} 32px),
          repeating-linear-gradient(90deg, transparent, transparent 31px, ${tokens.line} 31px, ${tokens.line} 32px)
        `,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 380,
          backgroundColor: tokens.bgElev,
          borderRadius: 'var(--r-lg)',
          border: `1px solid ${tokens.line}`,
          p: '40px 36px 32px',
        }}
      >
        {/* Brand mark + wordmark */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              backgroundColor: tokens.ink,
              borderRadius: 'var(--r-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
              W
            </Typography>
          </Box>
          <Typography
            sx={{ fontSize: 15, fontWeight: 600, color: tokens.ink, letterSpacing: '-0.01em' }}
          >
            Workload
          </Typography>
        </Box>

        {/* Page heading */}
        <Typography
          component="h1"
          sx={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', mb: 0.5 }}
        >
          Sign in
        </Typography>
        <Typography sx={{ fontSize: 13, color: tokens.ink3, mb: 3 }}>
          Internal maintenance workload system
        </Typography>

        {errorMessage ? (
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
        >
          <FormTextField
            name="email"
            control={control}
            label="Email"
            variant="outlined"
            fullWidth
            margin="normal"
            autoComplete="email"
          />
          <FormTextField
            name="password"
            control={control}
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            autoComplete="current-password"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                size="small"
              />
            }
            label={<Typography sx={{ fontSize: 13 }}>Keep me signed in</Typography>}
            sx={{ mt: 1 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disableRipple
            disabled={isSubmitting}
            sx={{ mt: 2 }}
          >
            {isSubmitting ? <CircularProgress size={16} color="inherit" /> : 'Sign in'}
          </Button>

          <Divider sx={{ my: 2, fontSize: 12, color: tokens.ink3 }}>or</Divider>

          <Button fullWidth variant="text">
            Continue with corporate SSO
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
