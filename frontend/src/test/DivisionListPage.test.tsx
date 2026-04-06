import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import DivisionListPage from '../pages/DivisionListPage'

const mockGetDivisions = vi.fn()
const mockCreateDivision = vi.fn()

vi.mock('../api/divisions', () => ({
  getDivisions: (...args: unknown[]) => mockGetDivisions(...args),
  createDivision: (...args: unknown[]) => mockCreateDivision(...args),
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
      <MemoryRouter>
        <DivisionListPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DivisionListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDivisions.mockResolvedValue([
      { id: '1', name: 'Division 1', branchCount: 3, objectCount: 50 },
      { id: '2', name: 'Division 2', branchCount: 1, objectCount: 10 },
    ])
    mockCreateDivision.mockResolvedValue({
      id: '3',
      name: 'Division 3',
      branchCount: 0,
      objectCount: 0,
    })
  })

  it('renders division list with data', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Division 1')).toBeInTheDocument()
      expect(screen.getByText('Division 2')).toBeInTheDocument()
    })
  })

  it('opens create dialog when button clicked', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Division 1')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Add division'))
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
  })
})
