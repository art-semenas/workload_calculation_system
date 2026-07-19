import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorPage, isServerError } from '../components/common/ErrorPage'

describe('ErrorPage', () => {
  it('renders the heading, message, and retry button', () => {
    render(<ErrorPage message="Database unavailable" onRetry={vi.fn()} />)

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText('Database unavailable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calls onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn()
    render(<ErrorPage onRetry={onRetry} />)

    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('hides the retry button when onRetry is not provided', () => {
    render(<ErrorPage />)

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })
})

describe('isServerError', () => {
  it('is true for a 5xx axios error', () => {
    expect(isServerError({ isAxiosError: true, response: { status: 500 } })).toBe(true)
    expect(isServerError({ isAxiosError: true, response: { status: 503 } })).toBe(true)
  })

  it('is false for 4xx errors and non-axios errors', () => {
    expect(isServerError({ isAxiosError: true, response: { status: 404 } })).toBe(false)
    expect(isServerError(new Error('boom'))).toBe(false)
    expect(isServerError(null)).toBe(false)
  })
})
