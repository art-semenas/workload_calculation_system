import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '../components/common/ConfirmDialog'

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
