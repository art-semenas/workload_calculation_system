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
vi.mock('../api/divisions', () => ({
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
            objectId: '123',
            objectName: 'Brest Archive',
            address: 'Moskovskaya St.',
            divisionName: 'Brest',
            branchName: 'Branch 1',
            engineers: ['Ivanov P.S.'],
            osMonthlyAvg: 0.1,
            psMonthlyAvg: 0.0,
            videoMonthlyAvg: 0.0,
            recordsMonthly: 0.0,
            repairNoTravelMonthly: 0.0,
            repairWithTravelMonthly: 0.0,
            roundTripMin: 40.0,
            pzvMinutes: 20.0,
            totalNoTravelMin: 0.0,
            itogoChisloNoTravel: 0.0,
            totalWithTravelMin: 0.0,
            itogoChisloWithTravel: 0.032327,
            r1PerVisitTotal: 0.5,
            r2PerVisitTotal: 0.3,
            computedAt: '2026-03-30T12:00:00Z',
          },
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
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
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 100 },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSvod>)

    const blob = new Blob(['test'])
    mockExport.mockResolvedValueOnce(blob)

    renderPage()
    const exportBtn = screen.getByRole('button', { name: /export csv/i })
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
