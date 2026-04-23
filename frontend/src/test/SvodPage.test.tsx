import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import SvodPage from '../pages/SvodPage'

// Mock the hooks
vi.mock('../hooks/useSvod', () => ({
  useSvod: vi.fn(),
}))

vi.mock('../api/svod', () => ({
  exportSvodXlsx: vi.fn(),
}))

// Mock divisions for filter dropdown
vi.mock('../api/divisions', async () => ({
  getDivisions: vi.fn().mockResolvedValue([]),
}))

import { useSvod } from '../hooks/useSvod'
import { exportSvodXlsx } from '../api/svod'

const mockUseSvod = vi.mocked(useSvod)
const mockExport = vi.mocked(exportSvodXlsx)

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SvodPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('SvodPage', () => {
  it('renders loading spinner while fetching', () => {
    mockUseSvod.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useSvod>)

    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders SVOD table with data', async () => {
    mockUseSvod.mockReturnValue({
      data: {
        content: [
          {
            object_id: '123',
            object_name: 'Brest Archive',
            address: 'Moskovskaya St.',
            division_name: 'Brest',
            branch_name: 'Branch 1',
            engineers: ['Ivanov P.S.'],
            os_monthly_avg: 0.1,
            ps_monthly_avg: 0.0,
            video_monthly_avg: 0.0,
            records_monthly: 0.0,
            repair_no_travel_monthly: 0.0,
            repair_with_travel_monthly: 0.0,
            round_trip_min: 40.0,
            pzv_minutes: 20.0,
            total_no_travel_min: 0.0,
            itogo_chislo_no_travel: 0.0,
            total_with_travel_min: 0.0,
            itogo_chislo_with_travel: 0.032327,
            r1_per_visit_total: 0.5,
            r2_per_visit_total: 0.3,
            computed_at: '2026-03-30T12:00:00Z',
            import_seq_no: 1,
          },
        ],
        total_elements: 1,
        total_pages: 1,
        page: 0,
        size: 100,
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSvod>)

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Brest Archive')).toBeInTheDocument()
    })
  })

  it('export button triggers XLSX download', async () => {
    mockUseSvod.mockReturnValue({
      data: { content: [], total_elements: 0, total_pages: 0, page: 0, size: 100 },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSvod>)

    const blob = new Blob(['test'])
    mockExport.mockResolvedValueOnce(blob)

    renderPage()
    const exportBtn = screen.getByRole('button', { name: /export xlsx/i })
    await userEvent.click(exportBtn)
    expect(mockExport).toHaveBeenCalled()
  })

  it('renders error alert when fetch fails', () => {
    mockUseSvod.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useSvod>)

    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
