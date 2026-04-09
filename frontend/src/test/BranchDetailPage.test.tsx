import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import BranchDetailPage from '../pages/BranchDetailPage'

const mockUseBranch = vi.fn()
const mockUseUpdateBranch = vi.fn()
const mockUseCreateObject = vi.fn()
const mockUseObjects = vi.fn()

vi.mock('../hooks/useBranches', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useBranch: (...args: unknown[]) => mockUseBranch(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useUpdateBranch: (...args: unknown[]) => mockUseUpdateBranch(...args),
}))

vi.mock('../hooks/useObjects', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useCreateObject: (...args: unknown[]) => mockUseCreateObject(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useObjects: (...args: unknown[]) => mockUseObjects(...args),
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
      <MemoryRouter initialEntries={['/branches/br-1']}>
        <Routes>
          <Route path="/branches/:id" element={<BranchDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('BranchDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseBranch.mockReturnValue({
      data: {
        id: 'br-1',
        name: 'Branch 1',
        divisionId: 'div-1',
        divisionName: 'Division 1',
        objectCount: 2,
      },
      isLoading: false,
    })
    mockUseObjects.mockReturnValue({
      data: [
        { id: 'obj-1', name: 'Object 1', branchId: 'br-1' },
        { id: 'obj-2', name: 'Object 2', branchId: 'br-1' },
      ],
      isLoading: false,
    })
    mockUseUpdateBranch.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    })
    mockUseCreateObject.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        id: 'obj-3',
        name: 'Object 3',
        branchId: 'br-1',
      }),
      isPending: false,
    })
  })

  it('renders branch name and division breadcrumb', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Branch 1')
    })

    expect(screen.getByText('Division 1')).toBeInTheDocument()
  })

  it('renders object list table', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Branch 1')
    })

    expect(screen.getByText('Object 1')).toBeInTheDocument()
    expect(screen.getByText('Object 2')).toBeInTheDocument()
  })

  it('opens create object form', async () => {
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Branch 1')
    )

    await userEvent.click(screen.getByText('Add object'))
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('navigates to object detail on row click', async () => {
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Branch 1')
    )

    const objectCell = screen.getByText('Object 1')
    const objectRow = objectCell.closest('tr')!
    await userEvent.click(objectRow)

    expect(mockNavigate).toHaveBeenCalledWith('/objects/obj-1')
  })
})
