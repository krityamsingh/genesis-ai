// frontend/src/__tests__/Dashboard.test.jsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock zustand store
jest.mock('../store/genesisStore', () => ({
  __esModule: true,
  default: (selector) => selector({
    stats: { kg: { total_docs: 42, backend: 'tfidf', collections: {} },
             memory: { buffer_turns: 3 }, router: { total_routed: 7 }, engine: 'fake/model' },
    learn: jest.fn(), learnLoading: false, messages: [], ask: jest.fn(),
    fetchStats: jest.fn(),
  })
}))

import Dashboard from '../Dashboard'

test('Dashboard renders stats', () => {
  render(<MemoryRouter><Dashboard /></MemoryRouter>)
  expect(screen.getByText('42')).toBeInTheDocument()   // total docs
  expect(screen.getByText('Dashboard')).toBeInTheDocument()
})
