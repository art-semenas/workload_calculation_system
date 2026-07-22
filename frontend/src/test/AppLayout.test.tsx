import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'

vi.mock('../stores/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      logout: vi.fn(),
      token: 'test',
      user: { name: 'Admin User', role: 'admin' },
      isAuthenticated: () => true,
    }),
}))

describe('AppLayout', () => {
  it('renders sidebar nav items', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Objects')).toBeInTheDocument()
    expect(screen.getByText('Divisions')).toBeInTheDocument()
  })

  it('renders Summary and Engineers nav items', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: 'Summary' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Engineers' })).toBeInTheDocument()
  })

  it('renders section labels', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    )

    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()
    expect(screen.getByText('Reference')).toBeInTheDocument()
  })

  it('renders user chip with initials and name', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    )

    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('AU')).toBeInTheDocument()
  })

  it('renders brand wordmark', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    )

    expect(screen.getByText('W')).toBeInTheDocument()
    expect(screen.getByText('Workload')).toBeInTheDocument()
  })
})
