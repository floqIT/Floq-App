'use client'

import { useState, useEffect } from 'react'
import { UserProfile } from '@clerk/nextjs'

export default function SettingsPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [wsName, setWsName] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const cached = localStorage.getItem('floq_workspaceId')
    if (cached) { setWorkspaceId(cached) }
    // Load workspace info
    fetch('/api/workspace/init').then(r => r.json()).then(d => {
      if (d.workspaceId) {
        localStorage.setItem('floq_workspaceId', d.workspaceId)
        setWorkspaceId(d.workspaceId)
      }
    })
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function saveName() {
    if (!wsName.trim() || !workspaceId) return
    setSavingName(true)
    try {
      const res = await fetch(`/api/workspace?workspaceId=${workspaceId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: wsName.trim() }),
      })
      if (res.ok) { setOriginalName(wsName.trim()); showToast('Workspace name updated') }
      else { const d = await res.json(); showToast(d.error ?? 'Failed') }
    } finally { setSavingName(false) }
  }

  async function clearOutcomes() {
    if (!workspaceId) return
    setClearing(true)
    try {
      const res = await fetch(`/api/outcomes/all?workspaceId=${workspaceId}`, { method: 'DELETE' })
      if (res.ok) { setClearConfirm(false); showToast('All outcomes deleted'); localStorage.removeItem('floq_workspaceId') }
      else { const d = await res.json(); showToast(d.error ?? 'Failed') }
    } finally { setClearing(false) }
  }

  const sectionStyle: React.CSSProperties = { background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, padding: '24px', marginBottom: 20 }
  const sectionTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: '#e8f4f8', marginBottom: 16 }
  const inputSt: React.CSSProperties = { background: '#040e17', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8, padding: '9px 12px', color: '#e8f4f8', fontSize: 14, outline: 'none', minWidth: 280 }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#040e17' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#e8f4f8', marginBottom: 2 }}>Settings</h1>
          <p style={{ fontSize: 13, color: '#6b8fa8' }}>Manage your workspace and account</p>
        </div>

        {/* Workspace */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Workspace</h2>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Workspace Name</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input style={inputSt} value={wsName} onChange={e => setWsName(e.target.value)} placeholder="My Workspace" onKeyDown={e => { if (e.key === 'Enter') saveName() }} />
              <button onClick={saveName} disabled={!wsName.trim() || savingName} style={{ padding: '9px 18px', background: wsName.trim() ? 'rgba(45,212,191,0.15)' : 'rgba(45,212,191,0.05)', color: wsName.trim() ? '#2dd4bf' : '#3a5a6e', border: `1px solid ${wsName.trim() ? 'rgba(45,212,191,0.3)' : 'rgba(45,212,191,0.1)'}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: wsName.trim() ? 'pointer' : 'not-allowed' }}>
                {savingName ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
          {workspaceId && (
            <div style={{ marginTop: 10 }}>
              <span style={{ fontSize: 11, color: '#6b8fa8' }}>Workspace ID: </span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#3a5a6e' }}>{workspaceId}</span>
            </div>
          )}
        </div>

        {/* Account */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Account</h2>
          <p style={{ fontSize: 13, color: '#6b8fa8', marginBottom: 16 }}>Manage your email, password, and connected accounts.</p>
          <UserProfile
            appearance={{
              elements: {
                card: { background: '#0a2236', border: '1px solid rgba(45,212,191,0.12)', borderRadius: 10 },
                profileSectionTitleText: { color: '#a8ccd8' },
                formFieldLabel: { color: '#6b8fa8' },
                formFieldInput: { background: '#040e17', borderColor: 'rgba(45,212,191,0.2)', color: '#e8f4f8', borderRadius: 8 },
                footerActionLink: { color: '#2dd4bf' },
                navbar: { display: 'none' },
                pageScrollBox: { padding: 0 },
              },
            }}
          />
        </div>

        {/* Appearance */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Appearance</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f4f8', marginBottom: 2 }}>Theme</div>
              <div style={{ fontSize: 13, color: '#6b8fa8' }}>Dark theme is active</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, background: 'rgba(107,143,168,0.12)', color: '#6b8fa8', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 20, padding: '4px 12px' }}>Light mode — Coming soon</span>
          </div>
        </div>

        {/* Danger Zone */}
        <div style={{ ...sectionStyle, border: '1px solid rgba(239,68,68,0.2)', marginBottom: 0 }}>
          <h2 style={{ ...sectionTitleStyle, color: '#ef4444' }}>Danger Zone</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f4f8', marginBottom: 2 }}>Clear all outcomes</div>
              <div style={{ fontSize: 13, color: '#6b8fa8' }}>Permanently delete all outcomes in this workspace.</div>
            </div>
            {clearConfirm ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setClearConfirm(false)} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8, color: '#6b8fa8', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={clearOutcomes} disabled={clearing} style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {clearing ? 'Clearing…' : 'Yes, Clear All'}
                </button>
              </div>
            ) : (
              <button onClick={() => setClearConfirm(true)} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Clear All Outcomes
              </button>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, padding: '10px 16px', borderRadius: 8, background: '#061c2e', border: '1px solid rgba(45,212,191,0.4)', color: '#2dd4bf', fontSize: 13, fontWeight: 600 }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
