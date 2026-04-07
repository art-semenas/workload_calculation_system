import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ObjectDetailPage from '../pages/ObjectDetailPage'

const mockUseObject = vi.fn()
const mockUseDeleteObject = vi.fn()

vi.mock('../hooks/useObjects', () => ({
  useObject: (...args: unknown[]) => mockUseObject(...args),
  useDeleteObject: (...args: unknown[]) => mockUseDeleteObject(...args),
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
})
