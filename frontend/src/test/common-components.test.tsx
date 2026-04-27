import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { Num } from '../components/common/Num'
import { StatusChip } from '../components/common/StatusChip'

describe('ConfirmDialog', () => {
  it('renders title and message when open', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Delete object?"
        message="All related data will be deleted."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByText('Delete object?')).toBeInTheDocument()
    expect(screen.getByText('All related data will be deleted.')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn()

    render(
      <ConfirmDialog
        open={true}
        title="Confirm"
        message="Sure?"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        open={true}
        title="Confirm"
        message="Sure?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})

describe('Num', () => {
  it('renders em dash when value is 0', () => {
    render(<Num value={0} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders formatted number when value is not 0', () => {
    render(<Num value={42.123456} digits={3} />)
    expect(screen.getByText('42.123')).toBeInTheDocument()
  })

  it('uses default digits=6 when not specified', () => {
    render(<Num value={3.14159265} />)
    expect(screen.getByText('3.141593')).toBeInTheDocument()
  })

  it('uses JetBrains Mono font', () => {
    const { container } = render(<Num value={123} />)
    const span = container.querySelector('span')
    const styles = window.getComputedStyle(span!)
    expect(styles.fontFamily).toContain('JetBrains Mono')
  })
})

describe('StatusChip', () => {
  it('renders with ok color variant', () => {
    const { container } = render(<StatusChip kind="ok" label="Healthy" />)
    const chip = container.querySelector('.MuiChip-root')
    expect(chip).toHaveStyle('background-color: var(--ok-soft)')
  })

  it('renders with warn color variant', () => {
    const { container } = render(<StatusChip kind="warn" label="Warning" />)
    const chip = container.querySelector('.MuiChip-root')
    expect(chip).toHaveStyle('background-color: var(--warn-soft)')
  })

  it('renders with danger color variant', () => {
    const { container } = render(<StatusChip kind="danger" label="Critical" />)
    const chip = container.querySelector('.MuiChip-root')
    expect(chip).toHaveStyle('background-color: var(--danger-soft)')
  })

  it('renders with accent color variant', () => {
    const { container } = render(<StatusChip kind="accent" label="Featured" />)
    const chip = container.querySelector('.MuiChip-root')
    expect(chip).toHaveStyle('background-color: var(--accent-soft)')
  })

  it('renders with default color variant', () => {
    const { container } = render(<StatusChip kind="default" label="Default" />)
    const chip = container.querySelector('.MuiChip-root')
    expect(chip).toHaveStyle('background-color: var(--bg-sunken)')
  })

  it('displays label text', () => {
    render(<StatusChip kind="ok" label="Operational" />)
    expect(screen.getByText('Operational')).toBeInTheDocument()
  })
})
