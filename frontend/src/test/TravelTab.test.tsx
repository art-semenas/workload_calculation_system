import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { TravelTab } from '../components/travel/TravelTab'

// ─── mock useTravel ───────────────────────────────────────────────────────────
const mockUseTravel = vi.fn()
const mockUseUpdateTravel = vi.fn()

vi.mock('../hooks/useTravel', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useTravel: (...args: unknown[]) => mockUseTravel(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useUpdateTravel: (...args: unknown[]) => mockUseUpdateTravel(...args),
}))

// ─── sample data ──────────────────────────────────────────────────────────────
const OBJ_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

const sampleTravel = {
  id: 'tttttttt-tttt-tttt-tttt-tttttttttttt',
  objectId: OBJ_ID,
  transportType: 'Car',
  distanceKm: 25,
  oneWayTimeMin: 30,
  roundTripMin: 60,
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TravelTab objectId={OBJ_ID} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function setupDefaultMocks() {
  mockUseTravel.mockReturnValue({ data: sampleTravel, isLoading: false })
  mockUseUpdateTravel.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })
}

// ─── tests ────────────────────────────────────────────────────────────────────
describe('TravelTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('renders editable fields (transportType, distanceKm, oneWayTimeMin)', async () => {
    renderTab()

    await waitFor(() => {
      expect(screen.getByLabelText(/transport type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/distance/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/one-way time/i)).toBeInTheDocument()
    })
  })

  it('roundTripMin is displayed but NOT editable (no input for it)', async () => {
    renderTab()

    await waitFor(() => {
      expect(screen.getByText(/round trip/i)).toBeInTheDocument()
      // The value 60 should appear as text
      expect(screen.getByText(/60/)).toBeInTheDocument()
    })

    // There should be no input with label roundTripMin
    expect(screen.queryByLabelText(/round trip/i)).not.toBeInTheDocument()
  })

  it('prefills from API data', async () => {
    renderTab()

    await waitFor(() => {
      expect(screen.getByLabelText(/transport type/i)).toHaveValue('Car')
      expect(screen.getByLabelText(/distance/i)).toHaveValue(25)
      expect(screen.getByLabelText(/one-way time/i)).toHaveValue(30)
    })
  })

  it('save payload excludes roundTripMin', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    mockUseUpdateTravel.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false })

    const user = userEvent.setup()
    renderTab()

    await waitFor(() => expect(screen.getByLabelText(/transport type/i)).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        transportType: 'Car',
        distanceKm: 25,
        oneWayTimeMin: 30,
      })

      // Make sure roundTripMin is NOT in the payload — verify via the positive assertion keys
      const [[firstCallArg]] = mockMutateAsync.mock.calls as [[Record<string, unknown>]]
      expect(Object.keys(firstCallArg)).not.toContain('roundTripMin')
    })
  })

  it('empty state (null data) renders empty form', async () => {
    mockUseTravel.mockReturnValue({ data: null, isLoading: false })

    renderTab()

    await waitFor(() => {
      expect(screen.getByLabelText(/transport type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/transport type/i)).toHaveValue('')
      expect(screen.getByLabelText(/distance/i)).toHaveValue(0)
      expect(screen.getByLabelText(/one-way time/i)).toHaveValue(0)
    })

    // roundTripMin label should not appear when data is null
    expect(screen.queryByText(/round trip/i)).not.toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseTravel.mockReturnValue({ data: undefined, isLoading: true })

    renderTab()

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByLabelText(/transport type/i)).not.toBeInTheDocument()
  })
})
