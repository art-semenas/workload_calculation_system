import { describe, it, expect, vi } from 'vitest'
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

describe('DashboardPage', () => {
  it('renders FTE by division section', async () => {
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

  it('renders "No uncovered objects" when no coverage gaps', async () => {
    mockDivisions.mockReturnValue({ data: [], isLoading: false } as ReturnType<
      typeof useDivisionsAggregation
    >)
    mockSvod.mockReturnValue({
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 },
      isLoading: false,
    } as ReturnType<typeof useSvod>)
    mockGaps.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof useCoverageGaps>)

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No uncovered objects')).toBeInTheDocument()
    })
  })

  it('renders top 10 objects section', async () => {
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
    await waitFor(() => {
      expect(screen.getByText('CBU Brest')).toBeInTheDocument()
    })
  })
})
