import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { RecordsTab } from '../components/records/RecordsTab'

// ─── mock useRecords ──────────────────────────────────────────────────────────
const mockUseRecords = vi.fn()
const mockUseUpdateRecords = vi.fn()

vi.mock('../hooks/useRecords', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useRecords: (...args: unknown[]) => mockUseRecords(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useUpdateRecords: (...args: unknown[]) => mockUseUpdateRecords(...args),
}))

// ─── sample data ──────────────────────────────────────────────────────────────
const OBJ_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

const sampleRecords = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  objectId: OBJ_ID,
  accessRequests: 10,
  monitoringRequests: 20,
  footageRequests: 30,
  backupControl: 40,
  securityAdmin: 50,
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RecordsTab objectId={OBJ_ID} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function setupDefaultMocks() {
  mockUseRecords.mockReturnValue({ data: sampleRecords, isLoading: false })
  mockUseUpdateRecords.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })
}

// ─── tests ────────────────────────────────────────────────────────────────────
describe('RecordsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('renders 5 fields', async () => {
    renderTab()

    await waitFor(() => {
      expect(screen.getByLabelText(/access requests/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/monitoring requests/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/footage requests/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/backup control/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/security admin/i)).toBeInTheDocument()
    })
  })

  it('prefills values from API data', async () => {
    renderTab()

    await waitFor(() => {
      expect(screen.getByLabelText(/access requests/i)).toHaveValue(10)
      expect(screen.getByLabelText(/monitoring requests/i)).toHaveValue(20)
      expect(screen.getByLabelText(/footage requests/i)).toHaveValue(30)
      expect(screen.getByLabelText(/backup control/i)).toHaveValue(40)
      expect(screen.getByLabelText(/security admin/i)).toHaveValue(50)
    })
  })

  it('shows loading state', () => {
    mockUseRecords.mockReturnValue({ data: undefined, isLoading: true })

    renderTab()

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByLabelText(/access requests/i)).not.toBeInTheDocument()
  })

  it('rejects negative values (Zod validation)', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    mockUseUpdateRecords.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false })

    const user = userEvent.setup()
    renderTab()

    await waitFor(() => expect(screen.getByLabelText(/access requests/i)).toBeInTheDocument())

    const field = screen.getByLabelText(/access requests/i)
    await user.clear(field)
    await user.type(field, '-1')

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      // Zod should report validation error — field should show error state
      // The form should NOT call mutateAsync with invalid data
      expect(mockMutateAsync).not.toHaveBeenCalled()
    })
  })

  it('save calls mutation', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    mockUseUpdateRecords.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false })

    const user = userEvent.setup()
    renderTab()

    await waitFor(() => expect(screen.getByLabelText(/access requests/i)).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        accessRequests: 10,
        monitoringRequests: 20,
        footageRequests: 30,
        backupControl: 40,
        securityAdmin: 50,
      })
    })
  })
})
