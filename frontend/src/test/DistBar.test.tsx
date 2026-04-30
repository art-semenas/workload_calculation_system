import { render, screen } from '@testing-library/react'
import { DistBar } from '../components/common/DistBar'
import { describe, it, expect } from 'vitest'

describe('DistBar', () => {
  it('renders all segments with correct labels', () => {
    render(
      <DistBar
        segments={[
          { tone: 'ok', count: 142, label: 'Normal' },
          { tone: 'warn', count: 48, label: 'Watch' },
          { tone: 'danger', count: 14, label: 'Overloaded' },
        ]}
      />
    )
    expect(screen.getByText(/Normal/)).toBeInTheDocument()
    expect(screen.getByText(/Watch/)).toBeInTheDocument()
    expect(screen.getByText(/Overloaded/)).toBeInTheDocument()
    expect(screen.getByText(/142/)).toBeInTheDocument()
  })
})
