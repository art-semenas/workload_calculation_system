import { render, screen } from '@testing-library/react'
import { SectionBlock } from '../components/common/SectionBlock'
import { describe, it, expect } from 'vitest'

describe('SectionBlock', () => {
  it('renders label and children', () => {
    render(
      <SectionBlock label="Assigned engineers">
        <table />
      </SectionBlock>
    )
    expect(screen.getByText(/Assigned engineers/i)).toBeInTheDocument()
  })

  it('renders meta text', () => {
    render(
      <SectionBlock label="Records" meta="24/year">
        <span />
      </SectionBlock>
    )
    expect(screen.getByText('24/year')).toBeInTheDocument()
  })
})
