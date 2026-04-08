import React, { useState } from 'react'

const TEMPLATES = [
  { label: 'Learn URL',       prompt: 'learn https://example.com/article' },
  { label: 'Quiz topic',      prompt: 'quiz me on machine learning fundamentals' },
  { label: 'Research paper',  prompt: 'parse and summarise this paper: https://arxiv.org/abs/...' },
  { label: 'History of',      prompt: 'history of artificial intelligence' },
  { label: 'What-if sim',     prompt: 'simulate what happens if interest rates rise 3%' },
  { label: 'Build model',     prompt: 'build an image classifier for medical X-rays' },
  { label: 'Cross-insight',   prompt: 'find cross-domain connections in stored knowledge' },
  { label: 'Probability',     prompt: 'what is the probability that AGI arrives before 2035' },
]

export default function PromptTemplates({ onSelect }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Quick Templates</h3>
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map(({ label, prompt }) => (
          <button key={label} onClick={() => onSelect?.(prompt)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-full text-xs font-medium text-gray-600 border border-transparent hover:border-indigo-200 transition-colors">
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
