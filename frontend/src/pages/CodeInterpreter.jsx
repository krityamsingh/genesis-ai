// frontend/src/pages/CodeInterpreter.jsx — v3 NEW PAGE
// Interactive code editor with execution output — powered by M9
import { useState, useRef } from 'react'
import '../styles/design-system.css'

const API = '/api/v1'
const LANGUAGES = ['python', 'bash', 'sql']

const EXAMPLES = {
  python: `# GENESIS Code Interpreter — Python
import math

def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        print(f"  {a}", end="")
        a, b = b, a + b
    print()

print("Fibonacci sequence (20 terms):")
fibonacci(20)

# Statistics
import statistics
data = [2, 4, 4, 4, 5, 5, 7, 9]
print(f"\\nData: {data}")
print(f"Mean:   {statistics.mean(data):.2f}")
print(f"Median: {statistics.median(data)}")
print(f"Stdev:  {statistics.stdev(data):.2f}")`,

  bash: `#!/bin/bash
# GENESIS Code Interpreter — Bash
echo "=== System Information ==="
echo "Date: $(date)"
echo "Uptime: $(uptime -p 2>/dev/null || echo 'N/A')"
echo ""
echo "=== Directory Listing ==="
ls -la /tmp 2>/dev/null | head -10
echo ""
echo "=== Environment ==="
env | grep -E "^(PATH|HOME|USER)" | head -5`,

  sql: `-- GENESIS Code Interpreter — SQL (SQLite)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    score REAL,
    created_at TEXT
);

INSERT INTO users (name, score, created_at) VALUES
    ('Alice', 95.5, '2024-01-01'),
    ('Bob',   87.0, '2024-01-02'),
    ('Carol', 92.3, '2024-01-03'),
    ('Dave',  78.9, '2024-01-04');

SELECT
    name,
    score,
    CASE WHEN score >= 90 THEN 'A' WHEN score >= 80 THEN 'B' ELSE 'C' END AS grade
FROM users
ORDER BY score DESC;`,
}

export default function CodeInterpreterPage() {
  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState(EXAMPLES.python)
  const [output, setOutput] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const textareaRef = useRef(null)

  const run = async () => {
    if (!code.trim() || running) return
    setRunning(true); setError(null); setOutput(null)
    const token = localStorage.getItem('genesis_token')
    try {
      const res = await fetch(`${API}/interpret/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setOutput(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  const handleTabKey = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = textareaRef.current
      if (!el) return
      const start = el.selectionStart, end = el.selectionEnd
      const newCode = code.slice(0, start) + '    ' + code.slice(end)
      setCode(newCode)
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 4 })
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run()
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', marginBottom: 4 }}>
          Code Interpreter
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>
          Run Python, Bash, and SQL safely · Ctrl+Enter to execute
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {LANGUAGES.map(lang => (
          <button
            key={lang}
            onClick={() => { setLanguage(lang); setCode(EXAMPLES[lang]); setOutput(null) }}
            className={`module-chip${language === lang ? ' active' : ''}`}
          >
            {lang === 'python' ? '🐍' : lang === 'bash' ? '💻' : '🗄️'} {lang}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => { setCode(''); setOutput(null) }}
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 13 }}
        >Clear</button>
        <button
          onClick={run}
          disabled={running || !code.trim()}
          className="btn btn-primary btn-sm"
          style={{ minWidth: 90, justifyContent: 'center' }}
        >
          {running ? (
            <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Running</>
          ) : '▶ Run'}
        </button>
      </div>

      {/* Editor */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-raised)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{language}</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{code.split('\n').length} lines</span>
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={handleTabKey}
          spellCheck={false}
          style={{
            display: 'block', width: '100%', minHeight: 280,
            background: '#1C1917', color: '#E7E5E0',
            fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7,
            border: 'none', outline: 'none', resize: 'vertical',
            padding: '16px 20px',
            tabSize: 4,
          }}
        />
      </div>

      {/* Output */}
      {(output || error) && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '8px 16px', borderBottom: '1px solid var(--border-1)',
            background: output?.error || error ? 'var(--error-bg)' : 'var(--success-bg)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: output?.error || error ? 'var(--error)' : 'var(--success)' }}>
              {output?.error || error ? '✗ Error' : '✓ Success'}
            </span>
            {output?.elapsed !== undefined && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                {output.elapsed * 1000 < 100 ? `${(output.elapsed * 1000).toFixed(1)}ms` : `${output.elapsed}s`}
              </span>
            )}
          </div>
          <pre style={{
            margin: 0, padding: '16px 20px', minHeight: 80, maxHeight: 400, overflowY: 'auto',
            background: '#1C1917', color: output?.error || error ? '#FCA5A5' : '#6EE7B7',
            fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7, border: 'none',
            borderRadius: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {error || output?.error || output?.stdout || '(no output)'}
          </pre>
        </div>
      )}
    </div>
  )
}
