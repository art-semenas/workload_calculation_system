import { render, screen } from '@testing-library/react'
import { HeroCard } from '../components/common/HeroCard'
import { describe, it, expect } from 'vitest'

describe('HeroCard', () => {
  it('renders hero value and title', () => {
    render(<HeroCard title="ИТОГО Числ" heroValue="1.611624" stats={[]} />)
    expect(screen.getByText('1.611624')).toBeInTheDocument()
    expect(screen.getByText('ИТОГО Числ')).toBeInTheDocument()
  })
})
