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
          division_id: '1',
          division_name: 'Brest',
          total_fte: 12.5,
          object_count: 245,
          gap_count: 12,
        },
      ],
      isLoading: false,
    } as ReturnType<typeof useDivisionsAggregation>)
    mockSvod.mockReturnValue({ data: { content: [] }, isLoading: false } as ReturnType<
      typeof useSvod
    >)
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
    mockSvod.mockReturnValue({ data: { content: [] }, isLoading: false } as ReturnType<
      typeof useSvod
    >)
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
            object_id: 'obj-1',
            object_name: 'CBU Brest',
            division_name: 'Brest',
            branch_name: 'Branch 1',
            itogo_chislo_with_travel: 0.064,
            engineers: [],
            os_monthly_avg: 0,
            ps_monthly_avg: 0,
            video_monthly_avg: 0,
            records_monthly: 0,
            repair_no_travel_monthly: 0,
            repair_with_travel_monthly: 0,
            round_trip_min: 0,
            pzv_minutes: 0,
            total_no_travel_min: 0,
            itogo_chislo_no_travel: 0,
            total_with_travel_min: 0,
            r1_per_visit_total: 0,
            r2_per_visit_total: 0,
            computed_at: null,
          },
        ],
        total_elements: 1,
        total_pages: 1,
        page: 0,
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
