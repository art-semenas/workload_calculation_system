import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreateDivisionDialog } from '../components/dialogs/CreateDivisionDialog'
import { useNotificationStore } from '../stores/notificationStore'

const mockCreateDivision = vi.fn()

vi.mock('../hooks/useDivisions', () => ({
  useCreateDivision: () => ({
    mutateAsync: mockCreateDivision,
    isPending: false,
    isError: false,
  }),
}))

function renderDialog(onClose = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <CreateDivisionDialog open onClose={onClose} />
    </QueryClientProvider>
  )
}

describe('CreateDivisionDialog error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNotificationStore.setState({ notifications: [] })
  })

  it('shows inline error on 422', async () => {
    mockCreateDivision.mockRejectedValue({
      response: { data: { error: { code: 422, message: 'Name too short' } } },
    })
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText('Division name'), 'X')
    await user.click(screen.getByRole('button', { name: /create division/i }))

    expect(await screen.findByText('Name too short')).toBeInTheDocument()
    // Inline only — no toast
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('shows warning toast on 409 duplicate name', async () => {
    mockCreateDivision.mockRejectedValue({
      response: { data: { error: { code: 409, message: 'Division name already exists' } } },
    })
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderDialog(onClose)

    await user.type(screen.getByLabelText('Division name'), 'Brest')
    await user.click(screen.getByRole('button', { name: /create division/i }))

    await waitFor(() => {
      const { notifications } = useNotificationStore.getState()
      expect(notifications).toHaveLength(1)
      expect(notifications[0].message).toBe('Division name already exists')
      expect(notifications[0].severity).toBe('warning')
    })
    // Dialog stays open so the user can correct the name
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes the dialog on success', async () => {
    mockCreateDivision.mockResolvedValue({ id: 'new-div' })
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderDialog(onClose)

    await user.type(screen.getByLabelText('Division name'), 'Vitebsk')
    await user.click(screen.getByRole('button', { name: /create division/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })
})
