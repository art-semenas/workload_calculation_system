import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import DivisionsListPage from '../pages/DivisionsListPage'

const mockGetDivisions = vi.fn()
const mockCreateDivision = vi.fn()

vi.mock('../api/divisions', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  getDivisions: (...args: unknown[]) => mockGetDivisions(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  createDivision: (...args: unknown[]) => mockCreateDivision(...args),
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
        <DivisionsListPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DivisionsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders divisions table with metrics columns', async () => {
    mockGetDivisions.mockResolvedValue([
      {
        id: 'd1',
        name: 'Brest',
        branchCount: 10,
        objectCount: 450,
        engineerCount: 32,
        requiredFte: 28.4,
        coverageGap: 3,
        utilisation: 0.88,
      },
    ])
    mockCreateDivision.mockResolvedValue({
      id: 'd1',
      name: 'Brest',
      branchCount: 10,
      objectCount: 450,
      engineerCount: 32,
      requiredFte: 28.4,
      coverageGap: 3,
      utilisation: 0.88,
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Brest')).toBeInTheDocument()
      expect(screen.getByText('BRE')).toBeInTheDocument() // Code column
    })
  })

  it('displays KPI row with division count and metrics', async () => {
    mockGetDivisions.mockResolvedValue([
      {
        id: 'd1',
        name: 'Brest',
        branchCount: 10,
        objectCount: 450,
        engineerCount: 32,
        requiredFte: 28.4,
        coverageGap: 3,
        utilisation: 0.88,
      },
      {
        id: 'd2',
        name: 'Minsk',
        branchCount: 15,
        objectCount: 500,
        engineerCount: 40,
        requiredFte: 35.2,
        coverageGap: 2,
        utilisation: 0.92,
      },
    ])
    mockCreateDivision.mockResolvedValue({
      id: 'd3',
      name: 'Grodno',
      branchCount: 5,
      objectCount: 100,
      engineerCount: 10,
      requiredFte: 10.0,
      coverageGap: 1,
      utilisation: 0.85,
    })

    renderPage()

    await waitFor(() => {
      // Check both divisions are rendered
      expect(screen.getByText('Brest')).toBeInTheDocument()
      expect(screen.getByText('MIN')).toBeInTheDocument() // Minsk code
      // Check KPI metrics are displayed
      expect(screen.getByText('Total engineers')).toBeInTheDocument()
      expect(screen.getByText('Avg utilisation')).toBeInTheDocument()
    })
  })

  it('handles null metrics gracefully', async () => {
    mockGetDivisions.mockResolvedValue([
      {
        id: 'd1',
        name: 'Brest',
        branchCount: 10,
        objectCount: 450,
        engineerCount: null,
        requiredFte: null,
        coverageGap: null,
        utilisation: null,
      },
    ])
    mockCreateDivision.mockResolvedValue({
      id: 'd1',
      name: 'Brest',
      branchCount: 10,
      objectCount: 450,
      engineerCount: null,
      requiredFte: null,
      coverageGap: null,
      utilisation: null,
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Brest')).toBeInTheDocument()
    })
  })
})
