import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreateEngineerDialog } from '../components/dialogs/CreateEngineerDialog'

const mockCreateEngineer = vi.fn()
const mockGetDivisions = vi.fn()

vi.mock('../hooks/useEngineers', () => ({
  useCreateEngineer: () => ({
    mutateAsync: mockCreateEngineer,
    isPending: false,
    isError: false,
  }),
}))

vi.mock('../api/divisions', () => ({
  getDivisions: (...args: unknown[]) => mockGetDivisions(...args) as unknown,
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderDialog(onClose = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <CreateEngineerDialog open onClose={onClose} />
    </QueryClientProvider>
  )
}

describe('CreateEngineerDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDivisions.mockResolvedValue([
      { id: 'div1', name: 'Brest' },
      { id: 'div2', name: 'Minsk' },
    ])
    mockCreateEngineer.mockResolvedValue({ id: 'new-eng' })
  })

  it('renders all form fields', async () => {
    renderDialog()
    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create engineer/i })).toBeInTheDocument()
  })

  it('has create engineer button that can be interacted with', async () => {
    renderDialog()

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /create engineer/i })
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()
    })
  })

  it('does not submit when required fields are empty', async () => {
    const user = userEvent.setup()
    renderDialog()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create engineer/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /create engineer/i }))

    await waitFor(() => {
      expect(mockCreateEngineer).not.toHaveBeenCalled()
    })
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderDialog(onClose)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onClose).toHaveBeenCalled()
  })
})
