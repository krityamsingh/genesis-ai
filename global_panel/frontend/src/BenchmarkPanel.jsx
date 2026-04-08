import React from 'react'
export default function BenchmarkPanel() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Benchmark</h2>
      <p className="text-gray-500">Run timed prompts against each module to benchmark latency and quality.</p>
      <div className="bg-white rounded-xl p-6 border text-center text-gray-400">
        Benchmark runner — connect to <code>/api/v1/core/route</code> with timing.
      </div>
    </div>
  )
}
