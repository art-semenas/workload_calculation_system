import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { EquipmentTab } from '../components/equipment/EquipmentTab'

// ─── mock useEquipment ────────────────────────────────────────────────────────
const mockUseDevices = vi.fn()
const mockUseAddDevice = vi.fn()
const mockUseUpdateDevice = vi.fn()
const mockUseRemoveDevice = vi.fn()
const mockUseAssignments = vi.fn()
const mockUseAddAssignment = vi.fn()
const mockUseUpdateAssignment = vi.fn()
const mockUseRemoveAssignment = vi.fn()

vi.mock('../hooks/useEquipment', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useDevices: (...args: unknown[]) => mockUseDevices(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useAddDevice: (...args: unknown[]) => mockUseAddDevice(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useUpdateDevice: (...args: unknown[]) => mockUseUpdateDevice(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useRemoveDevice: (...args: unknown[]) => mockUseRemoveDevice(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useAssignments: (...args: unknown[]) => mockUseAssignments(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useAddAssignment: (...args: unknown[]) => mockUseAddAssignment(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useUpdateAssignment: (...args: unknown[]) => mockUseUpdateAssignment(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useRemoveAssignment: (...args: unknown[]) => mockUseRemoveAssignment(...args),
}))

// ─── mock useCatalog ──────────────────────────────────────────────────────────
const mockUseCatalogDevices = vi.fn()
const mockUseCatalogDeviceContexts = vi.fn()

vi.mock('../hooks/useCatalog', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useCatalogDevices: (...args: unknown[]) => mockUseCatalogDevices(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- vi.fn() mock
  useCatalogDeviceContexts: (...args: unknown[]) => mockUseCatalogDeviceContexts(...args),
}))

// ─── sample data ──────────────────────────────────────────────────────────────
const DTYPE_CAMERA = '11111111-1111-1111-1111-111111111111'
const DTYPE_DVR = '22222222-2222-2222-2222-222222222222'
const DTYPE_NVR = '33333333-3333-3333-3333-333333333333'
const OBJ_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

const sampleDevices = [
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    objectId: OBJ_ID,
    deviceTypeId: DTYPE_CAMERA,
    deviceTypeName: 'Camera',
    quantityPhysical: 5,
  },
  {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    objectId: OBJ_ID,
    deviceTypeId: DTYPE_DVR,
    deviceTypeName: 'DVR',
    quantityPhysical: 2,
  },
]

const sampleAssignments = [
  {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    objectId: OBJ_ID,
    deviceTypeId: DTYPE_CAMERA,
    deviceTypeName: 'Camera',
    systemType: 'VIDEO' as const,
    quantityMaintained: 3,
    r1Minutes: 10,
    r2Minutes: 5,
  },
]

const sampleCatalogDevices = [
  { id: DTYPE_CAMERA, name: 'Camera' },
  { id: DTYPE_DVR, name: 'DVR' },
  { id: DTYPE_NVR, name: 'NVR' },
]

const sampleContexts = [
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    deviceTypeId: DTYPE_CAMERA,
    systemType: 'VIDEO' as const,
    r1Minutes: 10,
    r2Minutes: 5,
  },
]

// ─── helpers ──────────────────────────────────────────────────────────────────
function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EquipmentTab objectId={OBJ_ID} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function setupDefaultMocks() {
  mockUseDevices.mockReturnValue({ data: sampleDevices, isLoading: false })
  mockUseAssignments.mockReturnValue({ data: sampleAssignments, isLoading: false })
  mockUseCatalogDevices.mockReturnValue({ data: sampleCatalogDevices })
  mockUseCatalogDeviceContexts.mockReturnValue({ data: sampleContexts })
  mockUseAddDevice.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })
  mockUseUpdateDevice.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })
  mockUseRemoveDevice.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })
  mockUseAddAssignment.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })
  mockUseUpdateAssignment.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })
  mockUseRemoveAssignment.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })
}

// ─── tests ────────────────────────────────────────────────────────────────────
describe('EquipmentTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('renders inventory table with devices', async () => {
    renderTab()

    await waitFor(() => {
      // Camera appears in both the inventory table and the assignment group heading
      expect(screen.getAllByText('Camera').length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getAllByText('DVR').length).toBeGreaterThanOrEqual(1)
    // quantities shown in inventory table (may appear in multiple cells)
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
  })

  it('add device flow: opens dialog and submits', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    mockUseAddDevice.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false })

    renderTab()

    await waitFor(() => expect(screen.getByText('Add device')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Add device'))

    await waitFor(() => {
      expect(screen.getByText('Add Device')).toBeInTheDocument()
    })

    // The dialog should contain the device type select
    expect(screen.getByRole('combobox', { name: 'Device Type' })).toBeInTheDocument()
  })

  it('remove device: confirm dialog shown when remove button clicked', async () => {
    renderTab()

    await waitFor(() => expect(screen.getAllByText('Camera').length).toBeGreaterThanOrEqual(1))

    // click the remove (delete) button for "Camera"
    const removeBtn = screen.getByRole('button', { name: /remove camera/i })
    await userEvent.click(removeBtn)

    await waitFor(() => {
      expect(screen.getByText('Remove Device?')).toBeInTheDocument()
    })
  })

  it('filtered device options: already-in-inventory devices excluded from add dialog', async () => {
    renderTab()

    await waitFor(() => expect(screen.getByText('Add device')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Add device'))

    await waitFor(() => {
      expect(screen.getByText('Add Device')).toBeInTheDocument()
    })

    // Open the device type select
    await userEvent.click(screen.getByRole('combobox', { name: 'Device Type' }))

    await waitFor(() => {
      // NVR should be available (not in inventory)
      expect(screen.getByRole('option', { name: 'NVR' })).toBeInTheDocument()
    })

    // Camera and DVR are already in inventory — should NOT appear as options
    expect(screen.queryByRole('option', { name: 'Camera' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'DVR' })).not.toBeInTheDocument()
  })

  it('shows warning when quantityMaintained > quantityPhysical', async () => {
    // Camera has quantityPhysical=5, but assignment has quantityMaintained=10
    mockUseDevices.mockReturnValue({
      data: [
        {
          id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          objectId: OBJ_ID,
          deviceTypeId: DTYPE_CAMERA,
          deviceTypeName: 'Camera',
          quantityPhysical: 5,
        },
      ],
      isLoading: false,
    })
    mockUseAssignments.mockReturnValue({
      data: [
        {
          id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          objectId: OBJ_ID,
          deviceTypeId: DTYPE_CAMERA,
          deviceTypeName: 'Camera',
          systemType: 'VIDEO' as const,
          quantityMaintained: 10,
          r1Minutes: 10,
          r2Minutes: 5,
        },
      ],
      isLoading: false,
    })

    renderTab()

    await waitFor(() => {
      expect(screen.getAllByRole('alert')).not.toHaveLength(0)
    })

    const alerts = screen.getAllByRole('alert')
    const warningAlert = alerts.find((el) => el.textContent?.includes('exceed'))
    expect(warningAlert).toBeInTheDocument()
  })

  it('renders system assignments grouped by device', async () => {
    renderTab()

    await waitFor(() => {
      // Camera appears both in inventory table and as group heading in system assignments
      const cameraEls = screen.getAllByText('Camera')
      expect(cameraEls.length).toBeGreaterThanOrEqual(2)
    })

    // The assignment row: system type VIDEO and qty 3
    expect(screen.getByText('VIDEO')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows backend error NO_CONTEXT_FOR_SYSTEM as alert', async () => {
    const axiosError = {
      response: { data: { error: { code: 'NO_CONTEXT_FOR_SYSTEM' } } },
    }
    mockUseAddAssignment.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(axiosError),
      isPending: false,
    })

    renderTab()

    await waitFor(() => expect(screen.getByText('Add assignment')).toBeInTheDocument())

    // Open add assignment dialog
    await userEvent.click(screen.getByText('Add assignment'))

    await waitFor(() => {
      expect(screen.getByText('Add Assignment')).toBeInTheDocument()
    })

    // Select the device (Camera = dtype-1)
    await userEvent.click(screen.getByRole('combobox', { name: 'Device' }))
    await waitFor(() => expect(screen.getByRole('option', { name: 'Camera' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('option', { name: 'Camera' }))

    // After selecting device, wait for system type select to be enabled
    await waitFor(() => {
      const systemTypeSelect = screen.getByRole('combobox', { name: 'System Type' })
      expect(systemTypeSelect).not.toBeDisabled()
    })

    // Select system type VIDEO
    await userEvent.click(screen.getByRole('combobox', { name: 'System Type' }))
    await waitFor(() => expect(screen.getByRole('option', { name: 'VIDEO' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('option', { name: 'VIDEO' }))

    // Submit
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(
        screen.getByText('No catalog context exists for this device and system type.')
      ).toBeInTheDocument()
    })
  })

  it('shows backend error DEVICE_NOT_IN_INVENTORY as alert', async () => {
    const axiosError = {
      response: { data: { error: { code: 'DEVICE_NOT_IN_INVENTORY' } } },
    }
    mockUseAddAssignment.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(axiosError),
      isPending: false,
    })

    renderTab()

    await waitFor(() => expect(screen.getByText('Add assignment')).toBeInTheDocument())

    // Open add assignment dialog
    await userEvent.click(screen.getByText('Add assignment'))

    await waitFor(() => {
      expect(screen.getByText('Add Assignment')).toBeInTheDocument()
    })

    // Select the device (Camera = dtype-1)
    await userEvent.click(screen.getByRole('combobox', { name: 'Device' }))
    await waitFor(() => expect(screen.getByRole('option', { name: 'Camera' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('option', { name: 'Camera' }))

    // After selecting device, wait for system type select to be enabled
    await waitFor(() => {
      const systemTypeSelect = screen.getByRole('combobox', { name: 'System Type' })
      expect(systemTypeSelect).not.toBeDisabled()
    })

    // Select system type VIDEO
    await userEvent.click(screen.getByRole('combobox', { name: 'System Type' }))
    await waitFor(() => expect(screen.getByRole('option', { name: 'VIDEO' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('option', { name: 'VIDEO' }))

    // Submit
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(screen.getByText('Device is not in the physical inventory.')).toBeInTheDocument()
    })
  })
})
