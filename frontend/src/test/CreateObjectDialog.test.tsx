import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreateObjectDialog } from '../components/dialogs/CreateObjectDialog'

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
      { id: '11111111-1111-1111-1111-111111111111', name: 'Brest' },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Minsk' },
    ])
    mockGetDivisionBranches.mockImplementation((divId: string) => {
      if (divId === '11111111-1111-1111-1111-111111111111') {
        return Promise.resolve([
          {
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            name: 'Branch 1',
            divisionId: '11111111-1111-1111-1111-111111111111',
          },
          {
            id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            name: 'Branch 2',
            divisionId: '11111111-1111-1111-1111-111111111111',
          },
        ])
      }
      if (divId === '22222222-2222-2222-2222-222222222222') {
        return Promise.resolve([
          {
            id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
            name: 'Branch 3',
            divisionId: '22222222-2222-2222-2222-222222222222',
          },
        ])
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

  it('hides future-scope fields by default (SHOW_FUTURE_FIELDS=false)', async () => {
    renderDialog()

    await waitFor(() => expect(screen.getByLabelText(/object name/i)).toBeInTheDocument())

    // The future-scope inputs (Tier, Object ID, Travel norm, Visits/year, dummy Division)
    // are gated behind SHOW_FUTURE_FIELDS and must NOT be in the DOM by default.
    expect(screen.queryByLabelText('Tier')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Object ID')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Travel norm h')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Visits / year')).not.toBeInTheDocument()
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

  it('renders grouped branch options with division subheaders', async () => {
    const user = userEvent.setup()
    renderDialog()

    await waitFor(() => expect(screen.getByLabelText(/object name/i)).toBeInTheDocument())

    // Open the Branch select via its container testid
    const branchContainer = screen.getByTestId('dialog-branch-select-btn')
    const branchCombobox = within(branchContainer).getByRole('combobox')
    await user.click(branchCombobox)

    // Both division subheaders and all three branches appear in the dropdown listbox
    await waitFor(
      () => {
        const listbox = screen.getByRole('listbox')
        expect(within(listbox).getByText('Brest')).toBeInTheDocument()
        expect(within(listbox).getByText('Minsk')).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Branch 1' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Branch 2' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Branch 3' })).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  it('submits selected branch + name and calls createObject mutation', async () => {
    const user = userEvent.setup()
    renderDialog()

    await waitFor(() => expect(screen.getByLabelText(/object name/i)).toBeInTheDocument())

    await user.type(screen.getByLabelText(/object name/i), 'Test Object')

    const branchContainer = screen.getByTestId('dialog-branch-select-btn')
    const branchCombobox = within(branchContainer).getByRole('combobox')
    await user.click(branchCombobox)
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Branch 1' })).toBeInTheDocument()
    )
    await user.click(screen.getByRole('option', { name: 'Branch 1' }))

    // Wait for the select to close (listbox disappears) before submitting
    await waitFor(() =>
      expect(screen.queryByRole('option', { name: 'Branch 1' })).not.toBeInTheDocument()
    )

    await user.click(screen.getByRole('button', { name: /create object/i }))

    await waitFor(() => {
      expect(mockCreateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Object',
          branchId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        })
      )
    })
  })

  it('does not call createObject when no branch is selected (Zod validation fails)', async () => {
    const user = userEvent.setup()
    renderDialog()

    await waitFor(() => expect(screen.getByLabelText(/object name/i)).toBeInTheDocument())

    await user.type(screen.getByLabelText(/object name/i), 'Test Object')
    // intentionally do NOT pick a branch
    await user.click(screen.getByRole('button', { name: /create object/i }))

    // Give the form a tick to validate
    await waitFor(() => expect(mockCreateObject).not.toHaveBeenCalled())
  })
})
