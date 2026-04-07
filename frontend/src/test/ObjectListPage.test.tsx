import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ObjectListPage from '../pages/ObjectListPage'

const mockUseObjects = vi.fn()
const mockUseDivisions = vi.fn()
const mockUseCreateObject = vi.fn()

vi.mock('../hooks/useObjects', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useObjects: (...args: unknown[]) => mockUseObjects(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useCreateObject: (...args: unknown[]) => mockUseCreateObject(...args),
}))

vi.mock('../hooks/useDivisions', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useDivisions: (...args: unknown[]) => mockUseDivisions(...args),
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
        <ObjectListPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ObjectListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseObjects.mockReturnValue({
      data: [
        {
          id: 'obj-1',
          name: 'Object 1',
          divisionName: 'Division 1',
          branchName: 'Branch 1',
          address: '123 Street',
        },
        {
          id: 'obj-2',
          name: 'Object 2',
          divisionName: 'Division 2',
          branchName: 'Branch 2',
          address: '456 Ave',
        },
      ],
      isLoading: false,
    })
    mockUseDivisions.mockReturnValue({
      data: [
        { id: 'div-1', name: 'Division 1', branchCount: 1, objectCount: 1 },
        { id: 'div-2', name: 'Division 2', branchCount: 1, objectCount: 1 },
      ],
      isLoading: false,
    })
    mockUseCreateObject.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'obj-3', name: 'Object 3' }),
      isPending: false,
    })
  })

  it('renders object table with name and address', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Object 1')).toBeInTheDocument()
      expect(screen.getByText('Object 2')).toBeInTheDocument()
    })
  })

  it('navigates to object detail on row click', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('Object 1')).toBeInTheDocument())

    const objectCell = screen.getByText('Object 1')
    const objectRow = objectCell.closest('tr')!
    await userEvent.click(objectRow)

    expect(mockNavigate).toHaveBeenCalledWith('/objects/obj-1')
  })

  it('opens create object dialog', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('Object 1')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Add object'))
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
  })

  it('filters by division', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('Object 1')).toBeInTheDocument())

    const select = screen.getByRole('combobox')
    await userEvent.click(select)

    const option = await screen.findByRole('option', { name: 'Division 1' })
    await userEvent.click(option)

    await waitFor(() => {
      expect(mockUseObjects).toHaveBeenCalledWith('div-1')
    })
  })
})
