import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DivisionDetailPage from '../pages/DivisionDetailPage'

const mockUseDivision = vi.fn()
const mockUseUpdateDivision = vi.fn()
const mockUseCreateBranch = vi.fn()

vi.mock('../hooks/useDivisions', () => ({
  useDivision: (...args: unknown[]) => mockUseDivision(...args),
  useUpdateDivision: (...args: unknown[]) => mockUseUpdateDivision(...args),
  useCreateBranch: (...args: unknown[]) => mockUseCreateBranch(...args),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/divisions/div-1']}>
        <Routes>
          <Route path="/divisions/:id" element={<DivisionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DivisionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseDivision.mockReturnValue({
      data: {
        id: 'div-1',
        name: 'Division 1',
        branchCount: 2,
        objectCount: 10,
        branches: [
          { id: 'br-1', name: 'Branch 1', divisionId: 'div-1', objectCount: 5 },
          { id: 'br-2', name: 'Branch 2', divisionId: 'div-1', objectCount: 5 },
        ],
      },
      isLoading: false,
    })
    mockUseUpdateDivision.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    })
    mockUseCreateBranch.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        id: 'br-3',
        name: 'Branch 3',
        divisionId: 'div-1',
        objectCount: 0,
      }),
      isPending: false,
    })
  })

  it('renders division name as heading', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Division 1')
    })
  })

  it('renders branch table with object counts', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Division 1')
    })

    expect(screen.getByText('Branch 1')).toBeInTheDocument()
    expect(screen.getByText('Branch 2')).toBeInTheDocument()
  })

  it('opens create branch dialog', async () => {
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Division 1')
    )

    await userEvent.click(screen.getByText('Add branch'))
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
  })

  it('navigates to branch detail on row click', async () => {
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Division 1')
    )

    const branchCell = screen.getByText('Branch 1')
    const branchRow = branchCell.closest('tr')!
    await userEvent.click(branchRow)

    expect(mockNavigate).toHaveBeenCalledWith('/branches/br-1')
  })
})
