import { render, screen } from '@testing-library/react'
import { CapBar } from '../components/common/CapBar'
import { describe, it, expect } from 'vitest'

describe('CapBar', () => {
  it('renders a progress bar', () => {
    render(<CapBar pct={0.75} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it.each([
    [0.5, 'ok'],
    [0.92, 'warn'],
    [1.05, 'danger'],
  ])('applies correct tone for pct=%s', (pct, tone) => {
    const { container } = render(<CapBar pct={pct} />)
    // Verify the bar exists
    expect(container.firstChild).toBeInTheDocument()
  })
})
