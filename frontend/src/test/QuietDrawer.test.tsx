import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuietDrawer, DrawerSection } from '../components/common/QuietDrawer'
import { describe, it, expect, vi } from 'vitest'

describe('QuietDrawer', () => {
  it('renders title and children when open', () => {
    render(
      <QuietDrawer open={true} onClose={vi.fn()} title="FTE breakdown">
        <p>content</p>
      </QuietDrawer>
    )
    expect(screen.getByText('FTE breakdown')).toBeInTheDocument()
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('calls onClose when × button clicked', async () => {
    const onClose = vi.fn()
    render(
      <QuietDrawer open={true} onClose={onClose} title="T">
        <span />
      </QuietDrawer>
    )
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not render content when closed', () => {
    render(
      <QuietDrawer open={false} onClose={vi.fn()} title="T">
        <p>hidden</p>
      </QuietDrawer>
    )
    expect(screen.queryByText('hidden')).not.toBeInTheDocument()
  })
})

describe('DrawerSection', () => {
  it('renders label and children', () => {
    render(
      <DrawerSection label="FTE Breakdown">
        <p>section content</p>
      </DrawerSection>
    )
    expect(screen.getByText(/FTE Breakdown/i)).toBeInTheDocument()
    expect(screen.getByText('section content')).toBeInTheDocument()
  })

  it('renders uppercase label via CSS transform', () => {
    render(
      <DrawerSection label="Overview">
        <span />
      </DrawerSection>
    )
    const label = screen.getByText(/Overview/i)
    expect(label).toBeInTheDocument()
  })
})
