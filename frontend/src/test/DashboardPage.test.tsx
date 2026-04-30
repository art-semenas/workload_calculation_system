import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage'

vi.mock('../hooks/useAggregations', () => ({
  useDivisionsAggregation: vi.fn(),
  useCoverageGaps: vi.fn(),
}))

vi.mock('../hooks/useSvod', () => ({
  useSvod: vi.fn(),
}))

import { useDivisionsAggregation, useCoverageGaps } from '../hooks/useAggregations'
import { useSvod } from '../hooks/useSvod'

const mockDivisions = vi.mocked(useDivisionsAggregation)
const mockGaps = vi.mocked(useCoverageGaps)
const mockSvod = vi.mocked(useSvod)

const baseDivision = {
  divisionId: '1',
  divisionName: 'Brest',
  requiredFte: 12.5,
  objectCount: 245,
  coverageGapCount: 12,
  staffingNeed: 0,
  uncoveredLoad: 0,
  engineersTotal: 10,
  engineersOverloaded: 0,
  engineersWarning: 0,
  breakdown: { os: 0, ps: 0, video: 0, records: 0, repair: 0 },
}

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
  it('renders page title', () => {
    mockDivisions.mockReturnValue({ data: [], isLoading: false } as ReturnType<
      typeof useDivisionsAggregation
    >)
    mockSvod.mockReturnValue({
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 },
      isLoading: false,
    } as ReturnType<typeof useSvod>)
    mockGaps.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof useCoverageGaps>)

    renderPage()
    expect(screen.getByText('Maintenance workload')).toBeInTheDocument()
  })

  it('renders FTE by division section with division data', async () => {
    mockDivisions.mockReturnValue({
      data: [baseDivision],
      isLoading: false,
    } as ReturnType<typeof useDivisionsAggregation>)
    mockSvod.mockReturnValue({
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 },
      isLoading: false,
    } as ReturnType<typeof useSvod>)
    mockGaps.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof useCoverageGaps>)

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Brest')).toBeInTheDocument()
      expect(screen.getByText('12.5000')).toBeInTheDocument()
    })
  })

  it('renders KPI row with totals from divisions', async () => {
    mockDivisions.mockReturnValue({
      data: [baseDivision],
      isLoading: false,
    } as ReturnType<typeof useDivisionsAggregation>)
    mockSvod.mockReturnValue({
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 },
      isLoading: false,
    } as ReturnType<typeof useSvod>)
    mockGaps.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof useCoverageGaps>)

    renderPage()
    await waitFor(() => {
      // KPI label appears at least once (may also appear in table header)
      expect(screen.getAllByText('Required FTE').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Coverage gaps')).toBeInTheDocument()
      expect(screen.getByText('Overloaded engineers')).toBeInTheDocument()
    })
  })

  it('opens drawer and shows top objects when Details button is clicked', async () => {
    mockDivisions.mockReturnValue({ data: [], isLoading: false } as ReturnType<
      typeof useDivisionsAggregation
    >)
    mockSvod.mockReturnValue({
      data: {
        content: [
          {
            objectId: 'obj-1',
            objectName: 'CBU Brest',
            divisionName: 'Brest',
            branchName: 'Branch 1',
            itogoChisloWithTravel: 0.064,
            engineers: [],
            osMonthlyAvg: 0,
            psMonthlyAvg: 0,
            videoMonthlyAvg: 0,
            recordsMonthly: 0,
            repairNoTravelMonthly: 0,
            repairWithTravelMonthly: 0,
            roundTripMin: 0,
            pzvMinutes: 0,
            totalNoTravelMin: 0,
            itogoChisloNoTravel: 0,
            totalWithTravelMin: 0,
            r1PerVisitTotal: 0,
            r2PerVisitTotal: 0,
            computedAt: null,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 10,
      },
      isLoading: false,
    } as ReturnType<typeof useSvod>)
    mockGaps.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof useCoverageGaps>)

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Details/i }))

    await waitFor(() => {
      expect(screen.getByText('CBU Brest')).toBeInTheDocument()
    })
  })

  it('shows "No uncovered objects" in drawer when no coverage gaps', async () => {
    mockDivisions.mockReturnValue({ data: [], isLoading: false } as ReturnType<
      typeof useDivisionsAggregation
    >)
    mockSvod.mockReturnValue({
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 },
      isLoading: false,
    } as ReturnType<typeof useSvod>)
    mockGaps.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof useCoverageGaps>)

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Details/i }))

    await waitFor(() => {
      expect(screen.getByText('No uncovered objects')).toBeInTheDocument()
    })
  })
})
