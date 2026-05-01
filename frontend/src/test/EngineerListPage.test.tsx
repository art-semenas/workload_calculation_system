import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import EngineerListPage from '../pages/EngineerListPage'

vi.mock('../hooks/useEngineers', () => ({
  useEngineers: vi.fn(),
  useCreateEngineer: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  ENGINEERS_QUERY_KEY: 'engineers',
}))

vi.mock('../hooks/useDivisions', () => ({
  useDivisions: vi.fn(() => ({
    data: [{ id: 'div-1', name: 'Brest', branchCount: 3, objectCount: 100 }],
    isLoading: false,
  })),
}))

import { useEngineers } from '../hooks/useEngineers'

const mockUseEngineers = vi.mocked(useEngineers)

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EngineerListPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('EngineerListPage', () => {
  it('renders loading spinner while fetching', () => {
    mockUseEngineers.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useEngineers>)

    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders engineer list with status chips', async () => {
    mockUseEngineers.mockReturnValue({
      data: [
        {
          id: 'eng-1',
          name: 'Ivanov Petr',
          email: 'ivanov@test.com',
          role: 'engineer',
          homeDivisionId: 'div-1',
          homeDivisionName: 'Brest',
          capacityFte: 1.0,
          isActive: true,
          objectCount: 47,
          totalLoad: 0.92,
          loadRatio: 0.92,
          status: 'WARNING' as const,
        },
        {
          id: 'eng-2',
          name: 'Sidorova Anna',
          email: 'sidorova@test.com',
          role: 'engineer',
          homeDivisionId: 'div-1',
          homeDivisionName: 'Brest',
          capacityFte: 1.0,
          isActive: true,
          objectCount: 31,
          totalLoad: 1.08,
          loadRatio: 1.08,
          status: 'OVERLOADED' as const,
        },
      ],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useEngineers>)

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Ivanov Petr')).toBeInTheDocument()
      expect(screen.getByText('Sidorova Anna')).toBeInTheDocument()
    })
    // Verify status chips are rendered (chip text shows percentage)
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('108%')).toBeInTheDocument()
    // DistBar renders capacity distribution legend
    expect(screen.getByText(/Normal 0/)).toBeInTheDocument()
    expect(screen.getByText(/Watch 1/)).toBeInTheDocument()
    expect(screen.getByText(/Overloaded 1/)).toBeInTheDocument()
  })

  it('opens create engineer dialog on button click', async () => {
    mockUseEngineers.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useEngineers>)

    renderPage()
    const createBtn = screen.getByRole('button', { name: /create engineer/i })
    await userEvent.click(createBtn)

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/capacity/i)).toBeInTheDocument()
    })
  })

  it('filters engineers by name search', async () => {
    mockUseEngineers.mockReturnValue({
      data: [
        {
          id: 'eng-1',
          name: 'Ivanov Petr',
          email: 'i@t.com',
          role: 'engineer',
          homeDivisionId: 'div-1',
          homeDivisionName: 'Brest',
          capacityFte: 1.0,
          isActive: true,
          objectCount: 10,
          totalLoad: 0.5,
          loadRatio: 0.5,
          status: 'NORMAL' as const,
        },
        {
          id: 'eng-2',
          name: 'Kozlov Dmitry',
          email: 'k@t.com',
          role: 'engineer',
          homeDivisionId: 'div-1',
          homeDivisionName: 'Brest',
          capacityFte: 0.5,
          isActive: true,
          objectCount: 5,
          totalLoad: 0.24,
          loadRatio: 0.48,
          status: 'NORMAL' as const,
        },
      ],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useEngineers>)

    renderPage()
    const searchField = screen.getByPlaceholderText(/search/i)
    await userEvent.type(searchField, 'Kozlov')

    await waitFor(() => {
      expect(screen.getByText('Kozlov Dmitry')).toBeInTheDocument()
      expect(screen.queryByText('Ivanov Petr')).not.toBeInTheDocument()
    })
  })
})
