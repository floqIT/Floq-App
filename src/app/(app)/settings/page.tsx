'use client'

import { useState, useEffect } from 'react'
import { UserProfile } from '@clerk/nextjs'

type Tab = 'workspace' | 'profile' | 'appearance' | 'danger'

interface WorkspaceInfo {
  id: string
  name: string
  createdAt: string
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'danger', label: 'Danger Zone' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('workspace')
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [wsInfo, setWsInfo] = useState<WorkspaceInfo | null>(null)
  const [wsName, setWsName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Danger zone
  const [clearConfirmText, setClearConfirmText] = useState('')
  const [clearing, setClearing] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Appearance
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')

  useEffect(() => {
    // Load density from localStorage
    const saved = localStorage.getItem('floq_density') as 'comfortable' | 'compact' | null
    if (saved) setDensity(saved)

    // Init workspace
    const cached = localStorage.getItem('floq_workspaceId')
    const fetchWs = (id: string) => {
      fetch(`/api/workspace?workspaceId=${id}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) { setWsInfo(d); setWsName(d.name) }
        })
    }
    if (cached) { setWorkspaceId(cached); fetchWs(cached); return }
    fetch('/api/workspace/init').then(r => r.json()).then(d => {
      if (d.workspaceId) {
        localStorage.setItem('floq_workspaceId', d.workspaceId)
        setWorkspaceId(d.workspaceId)
        fetchWs(d.workspaceId)
      }
    })
  }, [])

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function saveName() {
    if (!wsName.trim() || !workspaceId) return
    setSavingName(true)
    try {
      const res = await fetch(`/api/workspace?workspaceId=${workspaceId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: wsName.trim() }),
      })
      if (res.ok) { setWsInfo(i => i ? { ...i, name: wsName.trim() } : i); showToast('Workspace name updated') }
      else { const d = await res.json(); showToast(d.error ?? 'Failed', 'error') }
    } finally { setSavingName(false) }
  }

  async function clearOutcomes() {
    if (!workspaceId || clearConfirmText !== 'CONFIRM') return
    setClearing(true)
    try {
      const res = await fetch(`/api/outcomes/all?workspaceId=${workspaceId}`, { method: 'DELETE' })
      if (res.ok) { setClearConfirmText(''); showToast('All outcomes deleted') }
      else { const d = await res.json(); showToast(d.error ?? 'Failed', 'error') }
    } finally { setClearing(false) }
  }

  function saveDensity(d: 'comfortable' | 'compact') {
    setDensity(d)
    localStorage.setItem('floq_density', d)
    showToast(`Density set to ${d}`)
  }

  const inp: React.CSSProperties = {
    background: '#040e17', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8,
    padding: '9px 12px', color: '#e8f4f8', fontSize: 14, outline: 'none',
  }
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase',
    letterSpacing: '0.1em', marginBottom: 6, display: 'block',
  }
  const card: React.CSSProperties = {
    background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, padding: '24px', marginBottom: 20,
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#040e17' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 24px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#e8f4f8', marginBottom: 2 }}>Settings</h1>
          <p style={{ fontSize: 13, color: '#6b8fa8' }}>Manage your workspace, account, and preferences</p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(45,212,191,0.12)', marginBottom: 28 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '10px 20px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === t.id ? '#2dd4bf' : 'transparent'}`,
                color: activeTab === t.id ? '#2dd4bf' : '#6b8fa8',
                fontSize: 13,
                fontWeight: activeTab === t.id ? 700 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                marginBottom: -1,
                ...(t.id === 'danger' && activeTab === 'danger' ? { color: '#ef4444', borderBottomColor: '#ef4444' } : {}),
                ...(t.id === 'danger' && activeTab !== 'danger' ? { color: '#9b3535' } : {}),
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Workspace Tab ──────────────────────────────────────────────── */}
        {activeTab === 'workspace' && (
          <div>
            <div style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#e8f4f8', marginBottom: 20 }}>Workspace Details</h2>

              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Workspace Name</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    style={{ ...inp, minWidth: 260 }}
                    value={wsName}
                    onChange={e => setWsName(e.target.value)}
                    placeholder="My Workspace"
                    onKeyDown={e => { if (e.key === 'Enter') saveName() }}
                  />
                  <button
                    onClick={saveName}
                    disabled={!wsName.trim() || savingName}
                    style={{ padding: '9px 18px', background: wsName.trim() ? 'rgba(45,212,191,0.15)' : 'rgba(45,212,191,0.05)', color: wsName.trim() ? '#2dd4bf' : '#3a5a6e', border: `1px solid ${wsName.trim() ? 'rgba(45,212,191,0.3)' : 'rgba(45,212,191,0.1)'}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: wsName.trim() ? 'pointer' : 'not-allowed' }}
                  >
                    {savingName ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              {workspaceId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={lbl}>Workspace ID</label>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b8fa8', background: '#040e17', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 7, padding: '8px 12px', userSelect: 'all' }}>
                      {workspaceId}
                    </div>
                  </div>
                  {wsInfo?.createdAt && (
                    <div>
                      <label style={lbl}>Created</label>
                      <span style={{ fontSize: 13, color: '#a8ccd8' }}>
                        {new Date(wsInfo.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Profile Tab ───────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div style={{ background: '#040e17', borderRadius: 12, overflow: 'hidden' }}>
            <UserProfile
              routing="hash"
              appearance={{
                variables: {
                  colorPrimary: '#2dd4bf',
                  colorBackground: '#061c2e',
                  colorInputBackground: '#0a2236',
                  colorInputText: '#e8f4f8',
                  colorText: '#e8f4f8',
                  colorTextSecondary: '#a8ccd8',
                  colorNeutral: '#a8ccd8',
                  colorDanger: '#ef4444',
                  colorSuccess: '#22c55e',
                  borderRadius: '0.5rem',
                  fontFamily: 'Inter, system-ui, sans-serif',
                },
                elements: {
                  rootBox: { width: '100%' },
                  card: {
                    background: '#061c2e',
                    border: '1px solid rgba(45,212,191,0.15)',
                    boxShadow: 'none',
                    width: '100%',
                  },
                  navbar: {
                    background: '#040e17',
                    borderRight: '1px solid rgba(45,212,191,0.12)',
                  },
                  navbarButton: { color: '#a8ccd8' },
                  navbarButtonIcon: { color: '#6b8fa8' },
                  pageScrollBox: { background: '#061c2e', padding: '20px' },
                  headerTitle: { color: '#e8f4f8' },
                  headerSubtitle: { color: '#a8ccd8' },
                  formFieldLabel: { color: '#a8ccd8' },
                  formFieldInput: {
                    background: '#0a2236',
                    borderColor: 'rgba(45,212,191,0.2)',
                    color: '#e8f4f8',
                  },
                  formButtonPrimary: {
                    background: '#2dd4bf',
                    color: '#040e17',
                    fontWeight: 700,
                  },
                  badge: {
                    background: 'rgba(45,212,191,0.15)',
                    color: '#2dd4bf',
                  },
                  avatarBox: { border: '2px solid rgba(45,212,191,0.3)' },
                  dividerLine: { background: 'rgba(45,212,191,0.1)' },
                  profileSectionTitleText: { color: '#e8f4f8' },
                  accordionTriggerButton: { color: '#a8ccd8' },
                  menuList: { background: '#061c2e', border: '1px solid rgba(45,212,191,0.15)' },
                  menuItem: { color: '#a8ccd8' },
                },
              }}
            />
          </div>
        )}

        {/* ── Appearance Tab ────────────────────────────────────────────── */}
        {activeTab === 'appearance' && (
          <div>
            <div style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#e8f4f8', marginBottom: 20 }}>Theme</h2>
              <div style={{ display: 'flex', gap: 12 }}>
                {/* Dark - active */}
                <div style={{ flex: 1, background: '#040e17', border: '2px solid #2dd4bf', borderRadius: 10, padding: '16px', cursor: 'default', position: 'relative' }}>
                  <div style={{ width: '100%', height: 60, background: '#061c2e', borderRadius: 6, marginBottom: 10, display: 'flex', gap: 6, padding: 8, boxSizing: 'border-box' }}>
                    <div style={{ width: 60, height: '100%', background: '#040e17', borderRadius: 4 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ height: 8, background: 'rgba(45,212,191,0.3)', borderRadius: 3 }} />
                      <div style={{ height: 8, background: 'rgba(45,212,191,0.15)', borderRadius: 3, width: '70%' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f4f8', marginBottom: 2 }}>Dark</div>
                  <div style={{ fontSize: 11, color: '#6b8fa8' }}>Currently active</div>
                  <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: '50%', background: '#2dd4bf', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#040e17', fontWeight: 900 }}>✓</div>
                </div>
                {/* Light - disabled */}
                <div style={{ flex: 1, background: '#0a2236', border: '2px solid rgba(45,212,191,0.08)', borderRadius: 10, padding: '16px', cursor: 'not-allowed', opacity: 0.5, position: 'relative' }}>
                  <div style={{ width: '100%', height: 60, background: '#eef6f9', borderRadius: 6, marginBottom: 10, display: 'flex', gap: 6, padding: 8, boxSizing: 'border-box' }}>
                    <div style={{ width: 60, height: '100%', background: '#d1e8f0', borderRadius: 4 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ height: 8, background: '#2dd4bf', borderRadius: 3 }} />
                      <div style={{ height: 8, background: 'rgba(45,212,191,0.4)', borderRadius: 3, width: '70%' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f4f8', marginBottom: 2 }}>Light</div>
                  <div style={{ fontSize: 11, color: '#6b8fa8' }}>Coming soon</div>
                  <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700, background: 'rgba(107,143,168,0.2)', color: '#6b8fa8', borderRadius: 20, padding: '2px 8px', border: '1px solid rgba(107,143,168,0.2)' }}>SOON</div>
                </div>
              </div>
            </div>

            <div style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#e8f4f8', marginBottom: 6 }}>Sidebar Density</h2>
              <p style={{ fontSize: 13, color: '#6b8fa8', marginBottom: 18 }}>Controls spacing and padding in navigation and list views.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['comfortable', 'compact'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => saveDensity(d)}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 9, border: `2px solid ${density === d ? '#2dd4bf' : 'rgba(45,212,191,0.12)'}`, background: density === d ? 'rgba(45,212,191,0.1)' : 'transparent', color: density === d ? '#2dd4bf' : '#6b8fa8', fontSize: 13, fontWeight: density === d ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize' }}
                  >
                    {d}
                    {density === d && <span style={{ marginLeft: 6, fontSize: 11 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Danger Zone Tab ───────────────────────────────────────────── */}
        {activeTab === 'danger' && (
          <div>
            {/* Clear all outcomes */}
            <div style={{ background: '#061c2e', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '24px', marginBottom: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>Clear All Outcomes</h2>
                <p style={{ fontSize: 13, color: '#6b8fa8', lineHeight: 1.5 }}>Permanently delete every outcome in this workspace. Stage history, signals, and code links are also removed. This action cannot be undone.</p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ ...lbl, color: '#9b3535' }}>Type CONFIRM to proceed</label>
                <input
                  style={{ ...inp, minWidth: 220, borderColor: clearConfirmText === 'CONFIRM' ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.2)', color: '#f87171' }}
                  value={clearConfirmText}
                  onChange={e => setClearConfirmText(e.target.value)}
                  placeholder="CONFIRM"
                  spellCheck={false}
                />
              </div>
              <button
                onClick={clearOutcomes}
                disabled={clearConfirmText !== 'CONFIRM' || clearing}
                style={{ padding: '9px 20px', background: clearConfirmText === 'CONFIRM' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.05)', color: clearConfirmText === 'CONFIRM' ? '#ef4444' : '#6b3535', border: `1px solid ${clearConfirmText === 'CONFIRM' ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.1)'}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: clearConfirmText === 'CONFIRM' ? 'pointer' : 'not-allowed' }}
              >
                {clearing ? 'Clearing…' : 'Clear All Outcomes'}
              </button>
            </div>

            {/* Delete workspace (stub) */}
            <div style={{ background: '#061c2e', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 12, padding: '24px' }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>Delete Workspace</h2>
                <p style={{ fontSize: 13, color: '#6b8fa8', lineHeight: 1.5 }}>Permanently delete this workspace and all associated data. All members will lose access. This action is irreversible.</p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ ...lbl, color: '#9b3535' }}>Type CONFIRM to proceed</label>
                <input
                  style={{ ...inp, minWidth: 220, borderColor: deleteConfirmText === 'CONFIRM' ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.2)', color: '#f87171' }}
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="CONFIRM"
                  spellCheck={false}
                />
              </div>
              <button
                disabled
                style={{ padding: '9px 20px', background: 'rgba(239,68,68,0.05)', color: '#6b3535', border: '1px solid rgba(239,68,68,0.1)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                Delete Workspace
                <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(107,143,168,0.15)', color: '#6b8fa8', borderRadius: 20, padding: '2px 8px', border: '1px solid rgba(107,143,168,0.2)' }}>Contact support</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, padding: '10px 16px', borderRadius: 8, background: toast.type === 'success' ? '#061c2e' : '#1a0a0a', border: `1px solid ${toast.type === 'success' ? 'rgba(45,212,191,0.4)' : 'rgba(239,68,68,0.4)'}`, color: toast.type === 'success' ? '#2dd4bf' : '#ef4444', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', animation: 'slideIn 0.2s ease' }}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
