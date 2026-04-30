import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import DivisionDetailPage from '../pages/DivisionDetailPage'

vi.mock('../hooks/useDivisions', () => ({
  useDivision: () => ({
    data: { id: 'div-1', name: 'Test Division', branchCount: 0, objectCount: 0 },
    isLoading: false,
  }),
  useDivisionBranches: () => ({ data: [], isLoading: false }),
  useUpdateDivision: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateBranch: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('../hooks/useAggregations', () => ({
  useDivisionAggregation: () => ({ data: undefined, isLoading: false }),
  useCoverageGaps: () => ({ data: [], isLoading: false }),
  useBranchesAggregation: () => ({ data: [], isLoading: false }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/divisions/div-1']}>
        <Routes>
          <Route path="/divisions/:id" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DivisionDetailPage inline name editor', () => {
  it('shows a validation error when name is cleared and Save is clicked', async () => {
    const user = userEvent.setup()
    render(<DivisionDetailPage />, { wrapper })

    await user.click(screen.getByRole('button', { name: 'Edit division' }))

    const nameInput = screen.getByDisplayValue('Test Division')
    await user.clear(nameInput)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Currently FAILS: raw useState + `if (newName.trim())` guard does nothing on empty input
    // After fix: RHF+Zod shows validation error (z.string().min(1))
    await waitFor(() => {
      expect(screen.getByText('String must contain at least 1 character(s)')).toBeInTheDocument()
    })
  })
})
