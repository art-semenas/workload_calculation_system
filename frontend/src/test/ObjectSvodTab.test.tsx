import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ObjectDetailPage from '../pages/ObjectDetailPage'

vi.mock('../hooks/useSummary', () => ({
  useObjectSummary: vi.fn(),
  SUMMARY_QUERY_KEY: 'object-summary',
}))

vi.mock('../hooks/useObjects', () => ({
  useObject: vi.fn().mockReturnValue({
    data: {
      id: '123',
      name: 'Test Object',
      branchId: 'br-1',
      branchName: 'Branch 1',
      divisionName: 'Division 1',
      address: '123 Street',
    },
    isLoading: false,
  }),
  useDeleteObject: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateObject: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
  useCreateObject: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('../hooks/useDivisions', () => ({
  useDivisions: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  useDivision: vi.fn().mockReturnValue({ data: undefined, isLoading: false }),
}))

vi.mock('../components/equipment/EquipmentTab', () => ({
  EquipmentTab: () => null,
}))

vi.mock('../components/records/RecordsTab', () => ({
  RecordsTab: () => null,
}))

vi.mock('../components/repairs/RepairsTab', () => ({
  RepairsTab: () => null,
}))

vi.mock('../components/travel/TravelTab', () => ({
  TravelTab: () => null,
}))

import { useObjectSummary } from '../hooks/useSummary'

const mockUseObjectSummary = vi.mocked(useObjectSummary)

function renderPage(objectId: string = '123') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/objects/${objectId}`]}>
        <Routes>
          <Route path="/objects/:id" element={<ObjectDetailPage mode="detail" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Object Detail — Summary tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "No data" when no summary exists', async () => {
    mockUseObjectSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useObjectSummary>)

    renderPage()
    // Navigate to Summary tab (tab index 5 — the last tab)
    const svodTab = screen.getByRole('tab', { name: /summary/i })
    await userEvent.click(svodTab)

    await waitFor(() => {
      expect(screen.getByText('No data')).toBeInTheDocument()
    })
  })

  it('renders summary values when data exists', async () => {
    mockUseObjectSummary.mockReturnValue({
      data: {
        objectId: '123',
        osR1PerVisit: 0.7,
        osR2PerVisit: 1.4,
        psR1PerVisit: 0.0,
        psR2PerVisit: 0.0,
        videoR1PerVisit: 0.0,
        videoR2PerVisit: 0.0,
        r1PerVisitTotal: 0.7,
        r2PerVisitTotal: 1.4,
        osMonthlyAvg: 0.816667,
        psMonthlyAvg: 0.0,
        videoMonthlyAvg: 0.0,
        recordsMonthly: 0.0,
        repairNoTravelMonthly: 0.0,
        repairWithTravelMonthly: 0.0,
        roundTripMin: 40.0,
        pzvMinutes: 20.0,
        totalNoTravelMin: 0.82,
        itogoChisloNoTravel: 0.000082,
        totalWithTravelMin: 5.37,
        itogoChisloWithTravel: 0.032327,
        computedAt: '2026-03-30T12:00:00Z',
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useObjectSummary>)

    renderPage()
    const svodTab = screen.getByRole('tab', { name: /summary/i })
    await userEvent.click(svodTab)

    await waitFor(() => {
      expect(screen.getByText('0.032327')).toBeInTheDocument()
    })
  })
})
