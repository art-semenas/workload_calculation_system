import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, CircularProgress, Typography } from '@mui/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { FormTextField } from '../components/common/FormTextField'
import { LoginRequestSchema, type LoginRequest } from '../types/auth'
import { useAuthStore } from '../store/authStore'

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
  const storeLogin = useAuthStore((state) => state.login)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { control, handleSubmit, formState } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    setErrorMessage(null)

    try {
      const response = await login(data)
      storeLogin(response.token, response.user)
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
        background:
          'linear-gradient(135deg, rgba(232,240,254,1) 0%, rgba(245,247,250,1) 50%, rgba(226,239,218,1) 100%)',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Workload Calculation System
          </Typography>
          <Typography variant="h6" component="h2" color="text.secondary" gutterBottom>
            Sign In
          </Typography>

          {errorMessage ? (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {errorMessage}
            </Alert>
          ) : null}

          <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 2 }}>
            <FormTextField
              name="email"
              control={control}
              label="Email"
              variant="standard"
              fullWidth
              margin="normal"
              autoComplete="email"
            />
            <FormTextField
              name="password"
              control={control}
              label="Password"
              type="password"
              variant="standard"
              fullWidth
              margin="normal"
              autoComplete="current-password"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disableRipple
              disabled={isSubmitting}
              sx={{ mt: 3, minHeight: 44 }}
            >
              {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
