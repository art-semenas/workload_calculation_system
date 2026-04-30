import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { PageHead } from '../components/common/PageHead'
import { describe, it, expect } from 'vitest'

const renderPageHead = (props: React.ComponentProps<typeof PageHead>) => {
  return render(
    <BrowserRouter>
      <PageHead {...props} />
    </BrowserRouter>
  )
}

describe('PageHead', () => {
  it('renders title and breadcrumbs', () => {
    renderPageHead({
      crumbs: [{ label: 'Workload', to: '/' }, { label: 'Objects' }],
      title: 'Objects',
    })
    expect(screen.getByRole('heading', { name: 'Objects' })).toBeInTheDocument()
    expect(screen.getByText('Workload')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    renderPageHead({
      crumbs: [{ label: 'Workload' }],
      title: 'Dashboard',
      subtitle: 'Overview',
    })
    expect(screen.getByText('Overview')).toBeInTheDocument()
  })

  it('renders actions slot', () => {
    renderPageHead({
      crumbs: [{ label: 'Workload' }],
      title: 'Test',
      actions: <button>Export</button>,
    })
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
  })
})
