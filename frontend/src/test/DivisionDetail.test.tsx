import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DivisionDetailPage from '../pages/DivisionDetailPage'

vi.mock('../hooks/useDivisions', () => ({
  useDivision: vi.fn().mockReturnValue({
    data: { id: 'div-1', name: 'Brest', branchCount: 1, objectCount: 245 },
    isLoading: false,
  }),
  useDivisionBranches: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  useUpdateDivision: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
  useCreateBranch: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('../hooks/useAggregations', () => ({
  useDivisionAggregation: vi.fn(),
  useCoverageGaps: vi.fn(),
}))

import { useDivisionAggregation, useCoverageGaps } from '../hooks/useAggregations'

const mockDivAgg = vi.mocked(useDivisionAggregation)
const mockGaps = vi.mocked(useCoverageGaps)

function renderPage(divisionId: string = 'div-1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/divisions/${divisionId}`]}>
        <Routes>
          <Route path="/divisions/:id" element={<DivisionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DivisionDetailPage — M-02 additions', () => {
  it('shows FTE summary card with division totals', async () => {
    mockDivAgg.mockReturnValue({
      data: {
        divisionId: 'div-1',
        divisionName: 'Brest',
        requiredFte: 12.5,
        objectCount: 245,
        coverageGapCount: 12,
      },
      isLoading: false,
    } as ReturnType<typeof useDivisionAggregation>)
    mockGaps.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof useCoverageGaps>)

    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/12\.5000/)).toBeInTheDocument()
      expect(screen.getByText(/245/)).toBeInTheDocument()
    })
  })

  it('shows coverage gaps section with uncovered objects', async () => {
    mockDivAgg.mockReturnValue({
      data: {
        divisionId: 'div-1',
        divisionName: 'Brest',
        requiredFte: 12.5,
        objectCount: 245,
        coverageGapCount: 1,
      },
      isLoading: false,
    } as ReturnType<typeof useDivisionAggregation>)
    mockGaps.mockReturnValue({
      data: [
        {
          objectId: 'obj-1',
          objectName: 'Infokiosk INF 00635',
          divisionName: 'Brest',
          branchName: 'Branch 1',
          itogoChisloWithTravel: 0.008,
        },
      ],
      isLoading: false,
    } as ReturnType<typeof useCoverageGaps>)

    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/without an assigned engineer/i)).toBeInTheDocument()
      expect(screen.getByText('Infokiosk INF 00635')).toBeInTheDocument()
    })
  })
})
