import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage'

const mockUseDivisions = vi.fn()

vi.mock('../hooks/useDivisions', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useDivisions: (...args: unknown[]) => mockUseDivisions(...args),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseDivisions.mockReturnValue({
      data: [],
      isLoading: false,
    })
  })

  it('renders welcome heading', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Dashboard')
    })
  })

  it('renders division summary table', async () => {
    mockUseDivisions.mockReturnValue({
      data: [
        { id: 'div-1', name: 'Division Alpha', branchCount: 2, objectCount: 10 },
        { id: 'div-2', name: 'Division Beta', branchCount: 1, objectCount: 5 },
      ],
      isLoading: false,
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Division Alpha')).toBeInTheDocument()
      expect(screen.getByText('Division Beta')).toBeInTheDocument()
    })
  })

  it('shows placeholder for M-02 aggregation data', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Data will be available after M-02')).toBeInTheDocument()
    })
  })
})
