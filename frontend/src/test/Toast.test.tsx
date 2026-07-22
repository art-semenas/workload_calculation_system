import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toast } from '../components/common/Toast'
import { showNotification, useNotificationStore } from '../stores/notificationStore'

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] })
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
})

describe('Toast', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] })
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
