import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ObjectDetailPage from '../pages/ObjectDetailPage'

const mockUseObject = vi.fn()
const mockUseDeleteObject = vi.fn()
const mockUseUpdateObject = vi.fn()
const mockUseCreateObject = vi.fn()
const mockUseDivisions = vi.fn()
const mockUseDivision = vi.fn()

vi.mock('../hooks/useObjects', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useObject: (...args: unknown[]) => mockUseObject(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useDeleteObject: (...args: unknown[]) => mockUseDeleteObject(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useUpdateObject: (...args: unknown[]) => mockUseUpdateObject(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useCreateObject: (...args: unknown[]) => mockUseCreateObject(...args),
}))

vi.mock('../hooks/useDivisions', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useDivisions: (...args: unknown[]) => mockUseDivisions(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useDivision: (...args: unknown[]) => mockUseDivision(...args),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderDetailPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/objects/obj-1']}>
        <Routes>
          <Route path="/objects/:id" element={<ObjectDetailPage mode="detail" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function renderCreatePage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/objects/new']}>
        <Routes>
          <Route path="/objects/new" element={<ObjectDetailPage mode="create" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function renderEditPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/objects/obj-1/edit']}>
        <Routes>
          <Route path="/objects/:id/edit" element={<ObjectDetailPage mode="edit" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ObjectDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseObject.mockReturnValue({
      data: {
        id: 'obj-1',
        name: 'Object 1',
        branchId: 'br-1',
        branchName: 'Branch 1',
        divisionName: 'Division 1',
        address: '123 Street',
      },
      isLoading: false,
    })
    mockUseDeleteObject.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    })
    mockUseUpdateObject.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    })
    mockUseCreateObject.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'new-obj-1' }),
      isPending: false,
    })
    mockUseDivisions.mockReturnValue({
      data: [{ id: 'div-1', name: 'Division 1', branchCount: 1, objectCount: 0 }],
      isLoading: false,
    })
    mockUseDivision.mockReturnValue({
      data: undefined,
      isLoading: false,
    })
  })

  it('renders object name as heading', async () => {
    renderDetailPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Object 1')
    })
  })

  it('shows tab navigation', async () => {
    renderDetailPage()

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Object 1')
    )

    expect(screen.getByText('Equipment')).toBeInTheDocument()
    expect(screen.getByText('Records')).toBeInTheDocument()
    expect(screen.getByText('Repairs')).toBeInTheDocument()
    expect(screen.getByText('Travel')).toBeInTheDocument()
  })

  it('shows delete button', async () => {
    renderDetailPage()

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Object 1')
    )

    expect(screen.getByText('Delete object')).toBeInTheDocument()
  })

  it('shows placeholder for Engineers tab', async () => {
    renderDetailPage()

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Object 1')
    )

    await userEvent.click(screen.getByText('Engineers'))
    expect(screen.getByText(/Available in M-03/i)).toBeInTheDocument()
  })

  it('shows placeholder for Summary tab', async () => {
    renderDetailPage()

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Object 1')
    )

    await userEvent.click(screen.getByText('Summary'))
    expect(screen.getByText(/Available in M-02/i)).toBeInTheDocument()
  })

  it('confirms before deleting', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    mockUseDeleteObject.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    })

    renderDetailPage()

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Object 1')
    )

    await userEvent.click(screen.getByText('Delete object'))

    await waitFor(() => {
      expect(screen.getByText('Delete object?')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('obj-1')
    })
  })

  it('delete confirmation shows updated message text', async () => {
    renderDetailPage()

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Object 1')
    )

    await userEvent.click(screen.getByText('Delete object'))

    await waitFor(() => {
      expect(
        screen.getByText(
          /Deleting "Object 1" will also delete all related equipment, records, repairs, and travel data\. This action cannot be undone\./
        )
      ).toBeInTheDocument()
    })
  })

  it('create mode renders a form, not "Object not found"', async () => {
    renderCreatePage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('New Object')
    })

    expect(screen.queryByText('Object not found')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('edit mode renders a prefilled form', async () => {
    renderEditPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Edit Object')
    })

    expect(screen.queryByText('Object not found')).not.toBeInTheDocument()

    expect(screen.getByLabelText<HTMLInputElement>('Name').value).toBe('Object 1')
  })
})
