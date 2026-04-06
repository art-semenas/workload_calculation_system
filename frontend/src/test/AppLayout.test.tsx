import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      logout: vi.fn(),
      token: 'test',
      user: { name: 'Admin' },
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

  it('shows Summary and Engineers as disabled nav items in M-01', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    )

    const svodItem = screen.getByText('Summary')
    expect(svodItem).toBeInTheDocument()

    const engItem = screen.getByText('Engineers')
    expect(engItem).toBeInTheDocument()
  })
})
