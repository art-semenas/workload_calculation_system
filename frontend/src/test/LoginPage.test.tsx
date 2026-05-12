import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import LoginPage from '../pages/LoginPage'

const mockMutateAsync = vi.fn().mockResolvedValue({
  token: 'test-token',
  user: { id: '1', email: 'admin@workload.local', name: 'Admin', role: 'admin' },
})

vi.mock('../hooks/useAuth', () => ({
  useLogin: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

// Also mock the auth store so login doesn't throw
vi.mock('../store/authStore', () => ({
  useAuthStore: (
    selector: (s: { login: () => void; logout: () => void; token: null }) => unknown
  ) => selector({ login: vi.fn(), logout: vi.fn(), token: null }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LoginPage', () => {
  it('calls useLogin mutateAsync on form submit, not login() directly', async () => {
    const user = userEvent.setup()
    render(<LoginPage />, { wrapper })

    await user.type(screen.getByLabelText('Email'), 'admin@workload.local')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    // Currently FAILS: LoginPage calls login() from api/auth directly, not useLogin().mutateAsync
    expect(mockMutateAsync).toHaveBeenCalledWith({
      email: 'admin@workload.local',
      password: 'secret',
    })
  })
})
