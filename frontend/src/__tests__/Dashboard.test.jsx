// frontend/src/__tests__/Dashboard.test.jsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock recharts so it doesn't blow up in jsdom
jest.mock('recharts', () => {
  const React = require('react')
  const mockComponent = ({ children }) => React.createElement('div', null, children)
  return {
    AreaChart: mockComponent, Area: mockComponent,
    XAxis: mockComponent, YAxis: mockComponent,
    CartesianGrid: mockComponent, Tooltip: mockComponent,
    ResponsiveContainer: ({ children }) => React.createElement('div', { style: { width: 500, height: 300 } }, children),
  }
})

// Mock zustand store
jest.mock('../store/genesisStore', () => ({
  __esModule: true,
  default: (selector) => selector({
    stats: {
      docs_ingested: 42, queries_total: 8491,
      active_modules: 3, kg_nodes: 4820,
    },
    statsLoading:  false,
    modules:       [],
    learn:         jest.fn(),
    learnLoading:  false,
    learnResult:   null,
    fetchStats:    jest.fn(),
  })
}))

// FIX: was importing '../Dashboard' (legacy root-level dead code).
// The real component lives at '../pages/Dashboard'.
import Dashboard from '../pages/Dashboard'

test('Dashboard renders stats', () => {
  render(<MemoryRouter><Dashboard /></MemoryRouter>)
  expect(screen.getByText('Dashboard')).toBeInTheDocument()
  // stats card value
  expect(screen.getByText('42')).toBeInTheDocument()
})
