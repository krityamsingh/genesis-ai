// design.js — Genesis Admin Design System
// Shared tokens, components, and utilities used across all admin panels.

export const C = {
  // Backgrounds
  bgPage:    '#F8FAFC',
  bgCard:    '#FFFFFF',
  bgSidebar: '#0F172A',
  bgSidebarHover: '#1E293B',
  bgSidebarActive: '#1E3A5F',
  bgInput:   '#F8FAFC',
  bgMuted:   '#F1F5F9',
  bgHover:   '#F1F5F9',

  // Text
  textPrimary:   '#0F172A',
  textSecondary: '#64748B',
  textMuted:     '#94A3B8',
  textInverse:   '#F8FAFC',
  textSidebarActive: '#93C5FD',
  textSidebar:   '#94A3B8',

  // Borders
  border:     '#E2E8F0',
  borderFocus:'#3B82F6',

  // Accents
  blue:    '#3B82F6',
  blueDark:'#1D4ED8',
  blueLight:'#EFF6FF',
  green:   '#10B981',
  greenLight:'#D1FAE5',
  red:     '#EF4444',
  redLight: '#FEE2E2',
  amber:   '#F59E0B',
  amberLight:'#FEF3C7',
  purple:  '#8B5CF6',
  purpleLight:'#EDE9FE',
  slate:   '#64748B',
  slateLight:'#F1F5F9',

  // Layer colors
  layerColors: [
    '#3B82F6','#8B5CF6','#EC4899','#EF4444',
    '#F59E0B','#10B981','#06B6D4','#6366F1',
    '#84CC16','#F97316','#14B8A6','#A855F7',
  ],
}

export const F = {
  // Fonts
  sans:  '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
  mono:  '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
}

// ── Shared component styles ────────────────────────────────────────────────────

export function card(extra = {}) {
  return {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    ...extra,
  }
}

export function badge(color, bg) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', borderRadius: 99,
    fontSize: 11, fontWeight: 600,
    background: bg, color,
  }
}

export function btn(variant = 'default', extra = {}) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: '7px 14px', borderRadius: 8,
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    border: 'none', transition: 'all 120ms', whiteSpace: 'nowrap',
    fontFamily: F.sans,
  }
  const variants = {
    default: { background: C.bgMuted, color: C.textPrimary, border: `1px solid ${C.border}` },
    primary: { background: C.blue, color: '#fff' },
    danger:  { background: C.redLight, color: C.red, border: `1px solid #FECACA` },
    ghost:   { background: 'transparent', color: C.textSecondary, border: `1px solid transparent` },
    success: { background: C.greenLight, color: '#065F46', border: `1px solid #A7F3D0` },
  }
  return { ...base, ...variants[variant], ...extra }
}

export function input(extra = {}) {
  return {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 12px', borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.bgCard,
    color: C.textPrimary,
    fontSize: 13,
    fontFamily: F.sans,
    outline: 'none',
    ...extra,
  }
}

export function th() {
  return {
    padding: '10px 16px',
    fontSize: 11, fontWeight: 700,
    color: C.textSecondary,
    background: C.bgMuted,
    textAlign: 'left',
    whiteSpace: 'nowrap',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    borderBottom: `1px solid ${C.border}`,
  }
}

export function td(extra = {}) {
  return {
    padding: '12px 16px',
    fontSize: 13,
    color: C.textPrimary,
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: 'middle',
    ...extra,
  }
}

// ── Layer definitions ──────────────────────────────────────────────────────────
export const LAYERS = [
  { key: 'l01_syntax',      label: 'L01 Syntax',      desc: 'Tokenization, parse tree validation, AST generation',     icon: '⌥' },
  { key: 'l02_type_scope',  label: 'L02 Type/Scope',  desc: 'Type inference, scope resolution, symbol table lookup',   icon: '⊕' },
  { key: 'l03_deps',        label: 'L03 Deps',        desc: 'Dependency graph construction, import resolution',         icon: '⬡' },
  { key: 'l04_control',     label: 'L04 Control Flow',desc: 'CFG analysis, dead-code detection, branching paths',       icon: '◇' },
  { key: 'l05_runtime',     label: 'L05 Runtime Sim', desc: 'Symbolic execution, runtime simulation, value tracking',   icon: '◈' },
  { key: 'l06_async',       label: 'L06 Async Safety',desc: 'Coroutine safety, race condition detection, lock audit',   icon: '⟳' },
  { key: 'l07_security',    label: 'L07 Security',    desc: 'Injection checks, secrets scan, auth surface audit',       icon: '⊛' },
  { key: 'l08_compliance',  label: 'L08 Compliance',  desc: 'GDPR, PII detection, licensing, OWASP mapping',           icon: '◉' },
  { key: 'l09_perf',        label: 'L09 Performance', desc: 'Complexity analysis, hot-path detection, alloc profiling', icon: '⚡' },
  { key: 'l10_quality',     label: 'L10 Quality',     desc: 'Readability scoring, doc coverage, test density',         icon: '✦' },
  { key: 'l11_alignment',   label: 'L11 Alignment',   desc: 'Intent-output alignment, factuality, hallucination guard', icon: '◑' },
  { key: 'l12_self_heal',   label: 'L12 Self-Heal',   desc: 'Auto-patch suggestions, regression guard, diff replay',   icon: '⚕' },
]

// ── Module definitions ─────────────────────────────────────────────────────────
export const MODULES = {
  m1: { label: 'M1 Self-Learner',     icon: '◈', color: '#3B82F6', desc: 'Ingests sources, builds knowledge graph, self-teaches', layers: ['l01_syntax','l02_type_scope','l10_quality','l11_alignment'] },
  m2: { label: 'M2 Research Accel',   icon: '◉', color: '#8B5CF6', desc: 'Research paper parser, hypothesis generator, ranker',   layers: ['l03_deps','l05_runtime','l09_perf','l11_alignment'] },
  m3: { label: 'M3 AI Builder',       icon: '⬡', color: '#EC4899', desc: 'Designs, generates and deploys custom AI architectures', layers: ['l01_syntax','l02_type_scope','l03_deps','l04_control','l07_security'] },
  m4: { label: 'M4 Time Reconstruct', icon: '◇', color: '#F59E0B', desc: 'Historical reconstruction and future projection engine', layers: ['l05_runtime','l08_compliance','l11_alignment'] },
  m5: { label: 'M5 Intuition Engine', icon: '◐', color: '#10B981', desc: 'Bayesian reasoning, gap-filling, cross-module glue',    layers: ['l06_async','l10_quality','l11_alignment','l12_self_heal'] },
  m6: { label: 'M6 Reality Sim',      icon: '⊕', color: '#EF4444', desc: 'Reality simulation, code synthesis, world observer',   layers: ['l04_control','l05_runtime','l06_async','l07_security','l12_self_heal'] },
}

// ── Helpers ────────────────────────────────────────────────────────────────────
export function fmtDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function fmtDuration(start, end) {
  if (!end) return 'Active'
  const ms = new Date(end) - new Date(start)
  const m = Math.floor(ms / 60000)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m`
}

export function apiHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}` } }
}
