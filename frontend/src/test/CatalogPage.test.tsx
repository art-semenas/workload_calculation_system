import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import CatalogPage from '../pages/CatalogPage'

const mockGetCatalogDevices = vi.fn()
const mockGetCatalogDeviceContexts = vi.fn()

vi.mock('../api/catalog', () => ({
  getCatalogDevices: (...args: unknown[]) => mockGetCatalogDevices(...args) as unknown,
  getCatalogDeviceContexts: (...args: unknown[]) =>
    mockGetCatalogDeviceContexts(...args) as unknown,
  getCatalogRepairs: vi.fn().mockResolvedValue([]),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders device list in master rail', async () => {
    mockGetCatalogDevices.mockResolvedValue([
      { id: 'dt1', name: 'Galaxy 512', description: 'Security device' },
      { id: 'dt2', name: 'Axis Q1604', description: 'Camera' },
    ])
    mockGetCatalogDeviceContexts.mockResolvedValue([])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Device catalog')).toBeInTheDocument()
      expect(screen.getByText('Galaxy 512')).toBeInTheDocument()
      expect(screen.getByText('Axis Q1604')).toBeInTheDocument()
    })
  })

  it('shows device details when a device is selected', async () => {
    const user = userEvent.setup()
    mockGetCatalogDevices.mockResolvedValue([
      { id: 'dt1', name: 'Galaxy 512', description: 'Security device' },
    ])
    mockGetCatalogDeviceContexts.mockResolvedValue([
      {
        id: 'ctx1',
        deviceTypeId: 'dt1',
        systemType: { id: 'sys1', name: 'ОС', systemTypeOrder: 1 },
        r1Minutes: 120,
        r2Minutes: 60,
      },
    ])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Galaxy 512')).toBeInTheDocument()
    })

    const deviceRow = screen.getByText('Galaxy 512')
    await user.click(deviceRow)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Galaxy 512' })).toBeInTheDocument()
    })
  })

  it('displays per-system norms in detail panel', async () => {
    const user = userEvent.setup()
    mockGetCatalogDevices.mockResolvedValue([
      { id: 'dt1', name: 'Galaxy 512', description: 'Security device' },
    ])
    mockGetCatalogDeviceContexts.mockResolvedValue([
      {
        id: 'ctx1',
        deviceTypeId: 'dt1',
        systemType: { id: 'sys1', name: 'ОС', systemTypeOrder: 1 },
        r1Minutes: 120,
        r2Minutes: 60,
      },
      {
        id: 'ctx2',
        deviceTypeId: 'dt1',
        systemType: { id: 'sys2', name: 'ПС', systemTypeOrder: 2 },
        r1Minutes: 90,
        r2Minutes: 45,
      },
    ])

    renderPage()

    const deviceRow = await screen.findByText('Galaxy 512')
    await user.click(deviceRow)

    await waitFor(() => {
      expect(screen.getByText('Per-system norms')).toBeInTheDocument()
      expect(screen.getAllByText('ОС')).toHaveLength(2) // one in header, one in card
      expect(screen.getAllByText('ПС')).toHaveLength(2) // one in header, one in card
    })
  })

  it('handles empty device list', async () => {
    mockGetCatalogDevices.mockResolvedValue([])
    mockGetCatalogDeviceContexts.mockResolvedValue([])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Device catalog')).toBeInTheDocument()
    })
  })
})
