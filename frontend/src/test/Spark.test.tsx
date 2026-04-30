import { render } from '@testing-library/react'
import { Spark } from '../components/common/Spark'
import { describe, it, expect } from 'vitest'

describe('Spark', () => {
  it('renders an SVG polyline', () => {
    render(<Spark data={[1, 2, 3, 4, 5, 6, 7, 8]} />)
    expect(document.querySelector('polyline')).toBeInTheDocument()
  })

  it('renders nothing when data is empty', () => {
    const { container } = render(<Spark data={[]} />)
    expect(container.querySelector('polyline')).toBeNull()
  })
})
