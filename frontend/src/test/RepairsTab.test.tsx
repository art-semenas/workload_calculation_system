import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { RepairsTab } from '../components/repairs/RepairsTab'

// ─── mock useRepairs ──────────────────────────────────────────────────────────
const mockUseRepairs = vi.fn()
const mockUseUpdateRepair = vi.fn()

vi.mock('../hooks/useRepairs', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useRepairs: (...args: unknown[]) => mockUseRepairs(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useUpdateRepair: (...args: unknown[]) => mockUseUpdateRepair(...args),
}))

// ─── mock useCatalog ──────────────────────────────────────────────────────────
const mockUseCatalogRepairs = vi.fn()

vi.mock('../hooks/useCatalog', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useCatalogRepairs: (...args: unknown[]) => mockUseCatalogRepairs(...args),
}))

// ─── sample data ──────────────────────────────────────────────────────────────
const OBJ_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const RT1_ID = '11111111-1111-1111-1111-111111111111'
const RT2_ID = '22222222-2222-2222-2222-222222222222'
const RT3_ID = '33333333-3333-3333-3333-333333333333'

const sampleCatalogRepairs = [
  { id: RT1_ID, name: 'Screen Replacement', timeMinutes: 60 },
  { id: RT2_ID, name: 'Battery Swap', timeMinutes: 30 },
  { id: RT3_ID, name: 'Firmware Update', timeMinutes: 15 },
]

const sampleRepairs = [
  {
    id: 'rr111111-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
    objectId: OBJ_ID,
    repairTypeId: RT1_ID,
    repairTypeName: 'Screen Replacement',
    count: 5,
  },
  // RT2 missing → should default to 0
]

// ─── helpers ──────────────────────────────────────────────────────────────────
function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RepairsTab objectId={OBJ_ID} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function setupDefaultMocks() {
  mockUseCatalogRepairs.mockReturnValue({ data: sampleCatalogRepairs, isLoading: false })
  mockUseRepairs.mockReturnValue({ data: sampleRepairs, isLoading: false })
  mockUseUpdateRepair.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })
}

// ─── tests ────────────────────────────────────────────────────────────────────
describe('RepairsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('renders dynamic rows from catalog', async () => {
    renderTab()

    await waitFor(() => {
      expect(screen.getByText('Screen Replacement')).toBeInTheDocument()
      expect(screen.getByText('Battery Swap')).toBeInTheDocument()
      expect(screen.getByText('Firmware Update')).toBeInTheDocument()
    })
  })

  it('prefills counts from repair data (0 when missing)', async () => {
    renderTab()

    await waitFor(() => {
      // RT1 has count 5
      const screenField = screen.getByLabelText('count-Screen Replacement')
      expect(screenField).toHaveValue(5)

      // RT2 missing from repairs → defaults to 0
      const batteryField = screen.getByLabelText('count-Battery Swap')
      expect(batteryField).toHaveValue(0)

      // RT3 missing from repairs → defaults to 0
      const firmwareField = screen.getByLabelText('count-Firmware Update')
      expect(firmwareField).toHaveValue(0)
    })
  })

  it('shows loading state when catalog is loading', () => {
    mockUseCatalogRepairs.mockReturnValue({ data: undefined, isLoading: true })

    renderTab()

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByText('Screen Replacement')).not.toBeInTheDocument()
  })

  it('shows loading state when repairs data is loading', () => {
    mockUseRepairs.mockReturnValue({ data: undefined, isLoading: true })

    renderTab()

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('validates non-negative integers (rejects negative)', async () => {
    const user = userEvent.setup()
    renderTab()

    await waitFor(() => expect(screen.getByText('Screen Replacement')).toBeInTheDocument())

    const screenField = screen.getByLabelText('count-Screen Replacement')
    await user.clear(screenField)
    await user.type(screenField, '-3')

    // Click the Save button for first row
    const saveButtons = screen.getAllByRole('button', { name: /save/i })
    await user.click(saveButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Must be a non-negative integer')).toBeInTheDocument()
      expect(mockUseUpdateRepair().mutateAsync).not.toHaveBeenCalled()
    })
  })

  it('save calls mutation with correct repairTypeId', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    mockUseUpdateRepair.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false })

    const user = userEvent.setup()
    renderTab()

    await waitFor(() => expect(screen.getByText('Battery Swap')).toBeInTheDocument())

    const batteryField = screen.getByLabelText('count-Battery Swap')
    await user.clear(batteryField)
    await user.type(batteryField, '3')

    const saveButtons = screen.getAllByRole('button', { name: /save/i })
    // Battery Swap is the second row (index 1)
    await user.click(saveButtons[1])

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        repairTypeId: RT2_ID,
        data: { count: 3 },
      })
    })
  })
})
