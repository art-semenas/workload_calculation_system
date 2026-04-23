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
        object_id: '123',
        os_r1_per_visit: 0.7,
        os_r2_per_visit: 1.4,
        ps_r1_per_visit: 0.0,
        ps_r2_per_visit: 0.0,
        video_r1_per_visit: 0.0,
        video_r2_per_visit: 0.0,
        r1_per_visit_total: 0.7,
        r2_per_visit_total: 1.4,
        os_monthly_avg: 0.816667,
        ps_monthly_avg: 0.0,
        video_monthly_avg: 0.0,
        records_monthly: 0.0,
        repair_no_travel_monthly: 0.0,
        repair_with_travel_monthly: 0.0,
        round_trip_min: 40.0,
        pzv_minutes: 20.0,
        total_no_travel_min: 0.82,
        itogo_chislo_no_travel: 0.000082,
        total_with_travel_min: 5.37,
        itogo_chislo_with_travel: 0.032327,
        computed_at: '2026-03-30T12:00:00Z',
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
