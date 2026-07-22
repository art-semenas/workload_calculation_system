import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from '@mui/material'
import { Toast } from '../components/common/Toast'
import { showNotification, useNotificationStore } from '../stores/notificationStore'

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [], suppressed: [] })
  })

  it('adds a notification via show', () => {
    useNotificationStore.getState().show('Something failed', 'error')

    const { notifications } = useNotificationStore.getState()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].message).toBe('Something failed')
    expect(notifications[0].severity).toBe('error')
  })

  it('removes a notification via dismiss', () => {
    useNotificationStore.getState().show('Something failed', 'error')
    const { notifications } = useNotificationStore.getState()

    useNotificationStore.getState().dismiss(notifications[0].id)
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('exposes showNotification for use outside React components', () => {
    showNotification('Interceptor error', 'warning')

    const { notifications } = useNotificationStore.getState()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].severity).toBe('warning')
  })

  // Query retries and parallel page queries produce the same failure repeatedly —
  // without dedup a single outage stacks a dozen identical toasts.
  it('does not stack a message that is already displayed', () => {
    useNotificationStore.getState().show('Server error', 'error')
    useNotificationStore.getState().show('Server error', 'error')
    useNotificationStore.getState().show('Server error', 'error')

    expect(useNotificationStore.getState().notifications).toHaveLength(1)
  })

  it('shows the message again once the earlier one is dismissed', () => {
    useNotificationStore.getState().show('Server error', 'error')
    const [first] = useNotificationStore.getState().notifications
    useNotificationStore.getState().dismiss(first.id)

    useNotificationStore.getState().show('Server error', 'error')

    expect(useNotificationStore.getState().notifications).toHaveLength(1)
  })

  it('keeps distinct messages', () => {
    useNotificationStore.getState().show('First error', 'error')
    useNotificationStore.getState().show('Second error', 'error')

    expect(useNotificationStore.getState().notifications).toHaveLength(2)
  })

  // Deduping must not eat a genuine second event: the repeat has to restart the
  // dismiss countdown, or the user sees the toast vanish right after acting.
  it('gives a duplicate a fresh id so its dismiss timer restarts', () => {
    useNotificationStore.getState().show('Saved successfully.', 'success')
    const firstId = useNotificationStore.getState().notifications[0].id

    useNotificationStore.getState().show('Saved successfully.', 'success')
    const { notifications } = useNotificationStore.getState()

    expect(notifications).toHaveLength(1)
    expect(notifications[0].id).not.toBe(firstId)
  })

  // A 5xx that a page renders as a full-page error must not also arrive as a toast,
  // including on the retries that follow.
  describe('suppression by a full-page error', () => {
    it('drops an existing toast for the suppressed message', () => {
      useNotificationStore.getState().show('Database unavailable', 'error')
      useNotificationStore.getState().suppress('Database unavailable')

      expect(useNotificationStore.getState().notifications).toHaveLength(0)
    })

    it('ignores later repeats while suppressed', () => {
      useNotificationStore.getState().suppress('Database unavailable')
      useNotificationStore.getState().show('Database unavailable', 'error')

      expect(useNotificationStore.getState().notifications).toHaveLength(0)
    })

    it('still shows unrelated messages while suppressed', () => {
      useNotificationStore.getState().suppress('Database unavailable')
      useNotificationStore.getState().show('Saved successfully.', 'success')

      expect(useNotificationStore.getState().notifications).toHaveLength(1)
    })

    it('shows the message again once unsuppressed', () => {
      useNotificationStore.getState().suppress('Database unavailable')
      useNotificationStore.getState().unsuppress('Database unavailable')
      useNotificationStore.getState().show('Database unavailable', 'error')

      expect(useNotificationStore.getState().notifications).toHaveLength(1)
    })
  })

  it('works when crypto.randomUUID is unavailable (non-secure context)', () => {
    const original = crypto.randomUUID
    // @ts-expect-error — simulating a browser on a plain-http origin
    crypto.randomUUID = undefined
    try {
      expect(() => useNotificationStore.getState().show('No uuid here', 'error')).not.toThrow()
      const { notifications } = useNotificationStore.getState()
      expect(notifications).toHaveLength(1)
      expect(notifications[0].id).toBeTruthy()
    } finally {
      crypto.randomUUID = original
    }
  })
})

describe('Toast', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [], suppressed: [] })
  })

  it('shows and dismisses a notification', async () => {
    useNotificationStore.getState().show('Test error', 'error')
    render(<Toast />)

    expect(await screen.findByText('Test error')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('renders warning severity for 409-style notifications', async () => {
    useNotificationStore.getState().show('Already exists', 'warning')
    render(<Toast />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveClass('MuiAlert-standardWarning')
  })

  it('renders error severity for other failures', async () => {
    useNotificationStore.getState().show('Server error', 'error')
    render(<Toast />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveClass('MuiAlert-standardError')
  })

  // MUI marks every body child except the modal portal aria-hidden, which would
  // silence the 409-while-dialog-open case in AC-FE-01.
  it('stays in the accessibility tree while a dialog is open', async () => {
    useNotificationStore.getState().show('Already exists', 'warning')
    render(
      <>
        <Dialog open>
          <div>dialog body</div>
        </Dialog>
        <Toast />
      </>
    )

    const alert = await screen.findByText('Already exists')
    expect(alert.closest('[aria-hidden="true"]')).toBeNull()
  })

  it('stacks multiple notifications', async () => {
    useNotificationStore.getState().show('First error', 'error')
    useNotificationStore.getState().show('Second error', 'warning')
    render(<Toast />)

    expect(await screen.findByText('First error')).toBeInTheDocument()
    expect(screen.getByText('Second error')).toBeInTheDocument()
  })

  describe('auto-dismiss', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('auto-dismisses after 5 seconds', () => {
      useNotificationStore.getState().show('Transient error', 'error')
      render(<Toast />)

      expect(screen.getByText('Transient error')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(useNotificationStore.getState().notifications).toHaveLength(0)
    })
  })
})
