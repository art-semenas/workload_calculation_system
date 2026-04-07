import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ObjectDetailPage from '../pages/ObjectDetailPage'

const mockUseObject = vi.fn()
const mockUseDeleteObject = vi.fn()
const mockUseUpdateObject = vi.fn()

vi.mock('../hooks/useObjects', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useObject: (...args: unknown[]) => mockUseObject(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useDeleteObject: (...args: unknown[]) => mockUseDeleteObject(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock, no safe generic available
  useUpdateObject: (...args: unknown[]) => mockUseUpdateObject(...args),
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
      <MemoryRouter initialEntries={['/objects/obj-1']}>
        <Routes>
          <Route path="/objects/:id" element={<ObjectDetailPage />} />
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
  })

  it('renders object name as heading', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Object 1')
    })
  })

  it('shows tab navigation', async () => {
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Object 1')
    )

    expect(screen.getByText('Equipment')).toBeInTheDocument()
    expect(screen.getByText('Records')).toBeInTheDocument()
    expect(screen.getByText('Repairs')).toBeInTheDocument()
    expect(screen.getByText('Travel')).toBeInTheDocument()
  })

  it('shows delete button', async () => {
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Object 1')
    )

    expect(screen.getByText('Delete object')).toBeInTheDocument()
  })

  it('shows placeholder for Engineers tab', async () => {
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Object 1')
    )

    await userEvent.click(screen.getByText('Engineers'))
    expect(screen.getByText(/Available in M-03/i)).toBeInTheDocument()
  })

  it('shows placeholder for Summary tab', async () => {
    renderPage()

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

    renderPage()

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
})
