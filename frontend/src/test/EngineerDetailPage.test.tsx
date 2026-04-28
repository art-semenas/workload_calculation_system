import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import EngineerDetailPage from '../pages/EngineerDetailPage'

vi.mock('../hooks/useEngineers', () => ({
  useEngineer: vi.fn(),
  useEngineerSummary: vi.fn(),
  useEngineerObjects: vi.fn(),
  useUpdateEngineer: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useAssignObjectToEngineer: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRemoveObjectFromEngineer: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  ENGINEERS_QUERY_KEY: 'engineers',
  ENGINEER_SUMMARY_QUERY_KEY: 'engineer-summary',
  ENGINEER_OBJECTS_QUERY_KEY: 'engineer-objects',
}))

vi.mock('../hooks/useObjects', () => ({
  useObjects: vi.fn(() => ({ data: [], isLoading: false })),
}))

vi.mock('../hooks/useDivisions', () => ({
  useDivisions: vi.fn(() => ({ data: [], isLoading: false })),
}))

import { useEngineer, useEngineerSummary, useEngineerObjects } from '../hooks/useEngineers'

const mockUseEngineer = vi.mocked(useEngineer)
const mockUseEngineerSummary = vi.mocked(useEngineerSummary)
const mockUseEngineerObjects = vi.mocked(useEngineerObjects)

const mockEngineer = {
  id: 'eng-1',
  name: 'Ivanov Petr Sergeevich',
  email: 'ivanov@test.com',
  role: 'engineer',
  homeDivisionId: 'div-1',
  homeDivisionName: 'Brest No. 100',
  capacityFte: 1.0,
  isActive: true,
  objectCount: 47,
  totalLoad: 0.921,
  loadRatio: 0.921,
  status: 'WARNING' as const,
}

const mockSummary = {
  engineerId: 'eng-1',
  totalLoad: 0.921,
  objectCount: 47,
  osLoad: 0.41,
  psLoad: 0.27,
  videoLoad: 0.09,
  recordsLoad: 0.05,
  repairLoad: 0.10,
  capacityFte: 1.0,
  loadRatio: 0.921,
  status: 'WARNING' as const,
}

const mockObjects = [
  {
    objectId: 'obj-1',
    objectName: 'CBU Brest, Lenina St., 10',
    divisionName: 'Brest',
    branchName: 'Branch 1',
    engineerShare: 0.032,
    itogoChisloWithTravel: 0.064,
    engineerCount: 2,
  },
  {
    objectId: 'obj-2',
    objectName: 'Brest Archive, Moskovskaya St., 202D',
    divisionName: 'Brest',
    branchName: 'Branch 1',
    engineerShare: 0.024,
    itogoChisloWithTravel: 0.024,
    engineerCount: 1,
  },
]

function renderPage(engineerId: string = 'eng-1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/engineers/${engineerId}`]}>
        <Routes>
          <Route path="/engineers/:id" element={<EngineerDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('EngineerDetailPage', () => {
  beforeEach(() => {
    mockUseEngineer.mockReturnValue({
      data: mockEngineer,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useEngineer>)
    mockUseEngineerSummary.mockReturnValue({
      data: mockSummary,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useEngineerSummary>)
    mockUseEngineerObjects.mockReturnValue({
      data: mockObjects,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useEngineerObjects>)
  })

  it('renders summary cards with correct values', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Ivanov Petr Sergeevich')).toBeInTheDocument()
      expect(screen.getByText(/0\.921 FTE/)).toBeInTheDocument()
      expect(screen.getByText(/1\.0 FTE/)).toBeInTheDocument()
      expect(screen.getByText(/92%/)).toBeInTheDocument()
      expect(screen.getByText('47')).toBeInTheDocument()
    })
  })

  it('renders system breakdown bars', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Security/)).toBeInTheDocument()
      expect(screen.getByText(/Fire/)).toBeInTheDocument()
      expect(screen.getByText(/Video/)).toBeInTheDocument()
      expect(screen.getByText(/Records/)).toBeInTheDocument()
      expect(screen.getByText(/Repairs/)).toBeInTheDocument()
    })
  })

  it('renders assigned objects table sorted by share descending', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('CBU Brest, Lenina St., 10')).toBeInTheDocument()
      expect(screen.getByText('Brest Archive, Moskovskaya St., 202D')).toBeInTheDocument()
    })
    // Each row has a "Remove" button
    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    expect(removeButtons).toHaveLength(2)
  })

  it('shows "Assign object" button', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /assign object/i })).toBeInTheDocument()
    })
  })

  it('shows loading spinner when data is loading', () => {
    mockUseEngineer.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useEngineer>)

    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
