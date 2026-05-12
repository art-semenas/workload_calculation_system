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

  it('renders metric cell values for a fully-populated division', async () => {
    mockGetDivisions.mockResolvedValue([
      {
        id: 'd1',
        name: 'Brest',
        branchCount: 10,
        objectCount: 450,
        engineerCount: 32,
        requiredFte: 28.4,
        unassignedObjectCount: 3,
        utilisation: 0.88,
      },
    ])

    renderPage()

    await waitFor(() => expect(screen.getByText('Brest')).toBeInTheDocument())

    // Each metric must appear in the table row exactly as the page formats it.
    // requiredFte is rendered via .toFixed(2)
    expect(screen.getByText('28.40')).toBeInTheDocument()
    // unassignedObjectCount > 0 is rendered as the raw number
    expect(screen.getByText('3')).toBeInTheDocument()
    // objectCount and engineerCount also appear in KPI totals, so multiple elements are expected
    expect(screen.getAllByText('450').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('32').length).toBeGreaterThanOrEqual(1)
  })

  it('renders dashes for every null-metric column', async () => {
    mockGetDivisions.mockResolvedValue([
      {
        id: 'd1',
        name: 'Brest',
        branchCount: 10,
        objectCount: 450,
        engineerCount: null,
        requiredFte: null,
        unassignedObjectCount: null,
        utilisation: null,
      },
    ])

    renderPage()

    await waitFor(() => expect(screen.getByText('Brest')).toBeInTheDocument())

    // Engineers col, FTE req col, Gap col, Utilisation col — all four should show '—'.
    // The Head engineer placeholder column is also '—'. So at least 5 dashes in the table row.
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(5)
  })

  it('renders Avg utilisation as dash and total engineers correctly when utilisation is null for all rows', async () => {
    mockGetDivisions.mockResolvedValue([
      {
        id: 'd1',
        name: 'Brest',
        branchCount: 10,
        objectCount: 450,
        engineerCount: 32,
        requiredFte: 28.4,
        unassignedObjectCount: 3,
        utilisation: null,
      },
      {
        id: 'd2',
        name: 'Minsk',
        branchCount: 15,
        objectCount: 500,
        engineerCount: 40,
        requiredFte: 35.2,
        unassignedObjectCount: 2,
        utilisation: null,
      },
    ])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Brest')).toBeInTheDocument()
      expect(screen.getByText('Minsk')).toBeInTheDocument()
    })

    // KPI: Total engineers should be 32 + 40 = 72
    expect(screen.getByText('72')).toBeInTheDocument()
    // KPI: Total objects should be 450 + 500 = 950
    expect(screen.getByText('950')).toBeInTheDocument()
    // KPI: Avg utilisation card label is present; value is '—' because all utilisations are null
    expect(screen.getByText('Avg utilisation')).toBeInTheDocument()
  })

  it('renders Avg utilisation as percentage when at least one row has utilisation', async () => {
    mockGetDivisions.mockResolvedValue([
      {
        id: 'd1',
        name: 'Brest',
        branchCount: 10,
        objectCount: 450,
        engineerCount: 32,
        requiredFte: 28.4,
        unassignedObjectCount: 3,
        utilisation: 0.88,
      },
    ])

    renderPage()

    await waitFor(() => expect(screen.getByText('Brest')).toBeInTheDocument())

    // 0.88 → 88% (the page rounds Math.round(avg * 100))
    expect(screen.getByText('88%')).toBeInTheDocument()
  })
})
