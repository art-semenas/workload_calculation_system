import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ObjectListPage from '../pages/ObjectListPage'

const mockUseObjects = vi.fn()
const mockUseDivisions = vi.fn()
const mockUseCreateObject = vi.fn()
const mockGetDivisionBranches = vi.fn()

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

vi.mock('../api/divisions', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  getDivisionBranches: (...args: unknown[]) => mockGetDivisionBranches(...args),
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
    mockGetDivisionBranches.mockImplementation((id: unknown) => {
      if (id === 'div-1') {
        return Promise.resolve([
          { id: 'branch-1a', name: 'Branch 1A', divisionId: 'div-1', objectCount: 1 },
          { id: 'branch-1b', name: 'Branch 1B', divisionId: 'div-1', objectCount: 1 },
        ])
      }

      if (id === 'div-2') {
        return Promise.resolve([
          { id: 'branch-2a', name: 'Branch 2A', divisionId: 'div-2', objectCount: 1 },
        ])
      }

      return Promise.resolve(undefined)
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

    const [filterSelect] = screen.getAllByRole('combobox')
    await userEvent.click(filterSelect)

    const option = await screen.findByRole('option', { name: 'Division 1' })
    await userEvent.click(option)

    await waitFor(() => {
      expect(mockUseObjects).toHaveBeenCalledWith('div-1')
    })
  })

  it('shows TOTAL Staffing column header and dash placeholder for each row', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('Object 1')).toBeInTheDocument())

    expect(screen.getByText('TOTAL Staffing')).toBeInTheDocument()
    const dashes = screen.getAllByText('-')
    expect(dashes).toHaveLength(2)
  })

  it('populates grouped branch selector in the dialog', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('Object 1')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Add object'))

    const branchSelect = screen.getByTestId('dialog-branch-select-btn')
    await userEvent.click(branchSelect)

    expect(await screen.findByRole('option', { name: 'Branch 1A' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Branch 1B' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Branch 2A' })).toBeInTheDocument()

    expect(mockGetDivisionBranches).toHaveBeenCalledWith('div-1')
    expect(mockGetDivisionBranches).toHaveBeenCalledWith('div-2')
  })

  it('keeps Create button disabled until a branch is selected', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('Object 1')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Add object'))

    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
  })
})
