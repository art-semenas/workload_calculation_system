import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DashboardPage', () => {
  it('renders KPI grid with tiles', async () => {
    mockDivisions.mockReturnValue({
      data: [
        {
          divisionId: '1',
          divisionName: 'Brest',
          requiredFte: 12.5,
          objectCount: 245,
          coverageGapCount: 12,
        },
      ],
      isLoading: false,
    })
    mockSvod.mockReturnValue({
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 },
      isLoading: false,
    })
    mockGaps.mockReturnValue({ data: [], isLoading: false })

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Required FTE')).toBeInTheDocument()
      expect(screen.getByText('Objects under maintenance')).toBeInTheDocument()
      expect(screen.getByText('Coverage gaps')).toBeInTheDocument()
      expect(screen.getByText('Engineers overloaded')).toBeInTheDocument()
    })
  })

  it('renders FTE by division section with proper styling', async () => {
    mockDivisions.mockReturnValue({
      data: [
        {
          divisionId: '1',
          divisionName: 'Division 1',
          requiredFte: 12.5,
          objectCount: 245,
          coverageGapCount: 12,
        },
      ],
      isLoading: false,
    })
    mockSvod.mockReturnValue({
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 },
      isLoading: false,
    })
    mockGaps.mockReturnValue({ data: [], isLoading: false })

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('FTE by division')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument() // Division number extracted from name
    })
  })

  it('renders top 5 objects card with objects', async () => {
    mockDivisions.mockReturnValue({ data: [], isLoading: false })
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
        size: 5,
      },
      isLoading: false,
    })
    mockGaps.mockReturnValue({ data: [], isLoading: false })

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Top 5 objects')).toBeInTheDocument()
      expect(screen.getByText('CBU Brest')).toBeInTheDocument()
    })
  })

  it('renders overloaded engineers stub card', async () => {
    mockDivisions.mockReturnValue({ data: [], isLoading: false })
    mockSvod.mockReturnValue({
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 5 },
      isLoading: false,
    })
    mockGaps.mockReturnValue({ data: [], isLoading: false })

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Overloaded engineers')).toBeInTheDocument()
      expect(screen.getByText('No overloaded engineers')).toBeInTheDocument()
    })
  })
})
