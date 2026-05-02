import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreateObjectDialog from '../components/dialogs/CreateObjectDialog'

const mockGetDivisions = vi.fn()
const mockGetDivisionBranches = vi.fn()
const mockCreateObject = vi.fn()

vi.mock('../api/divisions', () => ({
  getDivisions: (...args: unknown[]) => mockGetDivisions(...args) as unknown,
  getDivisionBranches: (...args: unknown[]) => mockGetDivisionBranches(...args) as unknown,
}))

vi.mock('../hooks/useObjects', () => ({
  useCreateObject: () => ({
    mutateAsync: mockCreateObject,
    isPending: false,
  }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderDialog() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={qc}>
      <CreateObjectDialog open onClose={vi.fn()} />
    </QueryClientProvider>
  )
}

describe('CreateObjectDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDivisions.mockResolvedValue([
      { id: 'div1', name: 'Brest' },
      { id: 'div2', name: 'Minsk' },
    ])
    mockGetDivisionBranches.mockImplementation((divId) => {
      if (divId === 'div1') {
        return Promise.resolve([
          { id: 'br1', name: 'Branch 1', divisionId: 'div1' },
          { id: 'br2', name: 'Branch 2', divisionId: 'div1' },
        ])
      }
      if (divId === 'div2') {
        return Promise.resolve([{ id: 'br3', name: 'Branch 3', divisionId: 'div2' }])
      }
      return Promise.resolve([])
    })
    mockCreateObject.mockResolvedValue({ id: 'new-obj' })
  })

  it('renders dialog with form fields', async () => {
    renderDialog()

    await waitFor(() => {
      expect(screen.getByLabelText(/object name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create object/i })).toBeInTheDocument()
    })
  })

  it('shows disabled future-scope fields', async () => {
    renderDialog()

    await waitFor(() => {
      // Verify that Tier, Travel norm, and Visits/year fields are present and disabled
      const allInputs = screen.getAllByRole('textbox')
      const disabledInputs = allInputs.filter((inp) => (inp as HTMLInputElement).disabled)
      // Should have at least Object ID, Travel norm, and Visits/year disabled
      expect(disabledInputs.length).toBeGreaterThanOrEqual(3)
    })
  })

  it('handles address field as optional', async () => {
    renderDialog()

    await waitFor(() => {
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
    })

    const addressField = screen.getByLabelText(/address/i)
    expect((addressField as HTMLInputElement).required).toBe(false)
  })

  it('displays create object button', async () => {
    renderDialog()

    await waitFor(() => {
      const createButton = screen.getByRole('button', { name: /create object/i })
      expect(createButton).toBeInTheDocument()
    })
  })
})
