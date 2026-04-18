import { useState } from 'react'
import useGenesisStore from '../store/genesisStore'
import { toast } from '../lib/toast'

const ACCENT_PRESETS = ['#6366F1', '#22C55E', '#F59E0B', '#EC4899', '#3B82F6', '#EF4444']

function Toggle({ on, onChange, color = 'var(--accent)' }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: '36px', height: '20px', borderRadius: '10px',
        background: on ? color : 'var(--bg-overlay)',
        position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background .2s',
      }}
    >
      <div style={{
        position: 'absolute', top: '3px', left: '3px',
        width: '14px', height: '14px', borderRadius: '50%',
        background: '#fff', transform: on ? 'translateX(16px)' : 'none',
        transition: 'transform .18s', boxShadow: '0 1px 3px rgba(0,0,0,.4)',
      }} />
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-muted)', marginBottom: '12px' }}>
        {title}
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, sub, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: '500' }}>{label}</div>
        {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const { user } = useGenesisStore()
  const [theme,    setTheme]    = useState('Dark')
  const [accent,   setAccent]   = useState('#6366F1')
  const [fontSize, setFontSize] = useState('14')
  const [prefs, setPrefs] = useState({
    stream:   true,
    badges:   true,
    markdown: true,
    enterSend:true,
  })

  const togglePref = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }))
  const initials = user?.username?.slice(0, 2).toUpperCase() || 'GE'

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '600px' }}>
      <h1 style={{ marginBottom: '24px' }}>Settings</h1>

      {/* Profile */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-muted)', marginBottom: '12px' }}>Profile</div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0,
            background: user?.avatar_url ? `url(${user.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--accent), var(--pink))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: '600', color: '#fff',
          }}>
            {!user?.avatar_url && initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>{user?.username || 'User'}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{user?.email || 'user@genesis.ai'}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '5px 10px' }} onClick={() => toast('Upload avatar', 'info')}>
                Change Avatar
              </button>
              <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '5px 10px' }} onClick={() => toast('Edit profile', 'info')}>
                Edit Name
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <Section title="Appearance">
        <Row label="Theme" sub="App colour scheme">
          <div style={{ display: 'flex', gap: '6px' }}>
            {['Dark', 'Light', 'System'].map(t => (
              <button key={t} className={`btn ${theme === t ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '12px', padding: '5px 12px' }}
                onClick={() => { setTheme(t); toast(`Theme: ${t}`, 'info') }}>
                {t}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Accent Colour" sub="Primary brand colour">
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {ACCENT_PRESETS.map(c => (
              <div key={c}
                onClick={() => { setAccent(c); toast(`Accent updated`, 'info') }}
                style={{
                  width: '22px', height: '22px', borderRadius: '50%', background: c,
                  cursor: 'pointer', border: `2px solid ${accent === c ? 'rgba(255,255,255,.6)' : 'transparent'}`,
                  transition: 'border-color 150ms',
                }}
              />
            ))}
          </div>
        </Row>
        <Row label="Font Size">
          <div style={{ display: 'flex', gap: '4px' }}>
            {['13', '14', '15', '16'].map(s => (
              <button key={s} className={`btn ${fontSize === s ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '12px', padding: '5px 10px' }}
                onClick={() => { setFontSize(s); toast(`Font: ${s}px`, 'info') }}>
                {s}px
              </button>
            ))}
          </div>
        </Row>
        <div style={{ borderBottom: 'none' }} />
      </Section>

      {/* Chat preferences */}
      <Section title="Chat Preferences">
        {[
          { key: 'stream',    label: 'Stream Responses',    sub: 'Show tokens as they generate'               },
          { key: 'badges',    label: 'Show Module Badges',  sub: 'Label which module answered each response'  },
          { key: 'markdown',  label: 'Markdown Rendering',  sub: 'Render formatted text, code blocks, tables' },
          { key: 'enterSend', label: 'Enter to Send',        sub: 'Shift+Enter inserts a new line'            },
        ].map(p => (
          <Row key={p.key} label={p.label} sub={p.sub}>
            <Toggle on={prefs[p.key]} onChange={() => togglePref(p.key)} />
          </Row>
        ))}
        <div style={{ borderBottom: 'none' }} />
      </Section>

      {/* Account */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-muted)', marginBottom: '12px' }}>Account</div>
        <div className="card">
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: '16px' }}
            onClick={() => toast('Change password dialog', 'info')}>
            Change Password
          </button>

          <div style={{ padding: '12px 0', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--red)', marginBottom: '10px' }}>
              Danger Zone
            </div>
            <button
              className="btn btn-danger"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => toast('Account deletion requires confirmation', 'error')}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
