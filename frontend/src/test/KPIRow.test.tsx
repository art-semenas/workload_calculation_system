import { render, screen } from '@testing-library/react'
import { KPIRow } from '../components/common/KPIRow'
import { describe, it, expect } from 'vitest'

describe('KPIRow', () => {
  it('renders all KPI items with labels and values', () => {
    render(
      <KPIRow
        items={[
          { label: 'Required FTE', value: '187.42' },
          { label: 'Objects', value: 2935 },
        ]}
      />
    )
    expect(screen.getByText('Required FTE')).toBeInTheDocument()
    expect(screen.getByText('187.42')).toBeInTheDocument()
    expect(screen.getByText('2935')).toBeInTheDocument()
  })

  it('renders delta text when provided', () => {
    render(
      <KPIRow
        items={[
          { label: 'FTE', value: '187', delta: '+2.14 vs Q3', deltaTone: 'ok' },
        ]}
      />
    )
    expect(screen.getByText('+2.14 vs Q3')).toBeInTheDocument()
  })
})
