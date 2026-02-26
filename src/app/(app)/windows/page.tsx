'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import type { Stage, SignalStatus } from '@/types/floq'
import { STAGE_COLORS, SIGNAL_COLORS } from '@/types/floq'

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json() })

interface FocusOutcomeInner {
  id: string; title: string; stage: Stage; signalStatus: SignalStatus; impactScore: number
}

interface FocusWindow {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
  focusOutcomes: { outcome: FocusOutcomeInner }[]
  _count: { focusOutcomes: number }
}

interface AllOutcome {
  id: string; title: string; stage: Stage; signalStatus: SignalStatus
}

function formatDate(d: string) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

export default function WindowsPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [selectedWindow, setSelectedWindow] = useState<FocusWindow | null>(null)
  const [addOutcomeOpen, setAddOutcomeOpen] = useState(false)
  const [toast, setToast] = useState('')

  // New window form
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const cached = localStorage.getItem('floq_workspaceId')
    if (cached) { setWorkspaceId(cached); return }
    fetch('/api/workspace/init').then(r => r.json()).then(d => { if (d.workspaceId) { localStorage.setItem('floq_workspaceId', d.workspaceId); setWorkspaceId(d.workspaceId) } })
  }, [])

  const { data: windows = [], mutate, isLoading } = useSWR<FocusWindow[]>(
    workspaceId ? `/api/windows?workspaceId=${workspaceId}` : null, fetcher
  )

  const { data: allOutcomes = [] } = useSWR<AllOutcome[]>(
    workspaceId && addOutcomeOpen ? `/api/outcomes?workspaceId=${workspaceId}` : null, fetcher
  )

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function createWindow() {
    if (!name.trim() || !startDate || !endDate || !workspaceId) return
    setSaving(true)
    try {
      const res = await fetch('/api/windows', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), workspaceId, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(), isActive }),
      })
      if (!res.ok) { const d = await res.json(); showToast(d.error ?? 'Failed'); return }
      mutate(); setNewOpen(false); setName(''); setStartDate(''); setEndDate(''); showToast('Focus window created')
    } finally { setSaving(false) }
  }

  async function addOutcome(outcomeId: string) {
    if (!selectedWindow) return
    const res = await fetch(`/api/windows/${selectedWindow.id}/outcomes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcomeId }),
    })
    if (res.ok) {
      mutate()
      const fresh = windows.find(w => w.id === selectedWindow.id)
      if (fresh) setSelectedWindow(fresh)
      showToast('Outcome added to window')
    }
  }

  async function removeOutcome(outcomeId: string) {
    if (!selectedWindow) return
    const res = await fetch(`/api/windows/${selectedWindow.id}/outcomes?outcomeId=${outcomeId}`, { method: 'DELETE' })
    if (res.ok) { mutate(); showToast('Removed from window') }
  }

  const inputSt: React.CSSProperties = { background: '#040e17', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8, padding: '8px 12px', color: '#e8f4f8', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const labelSt: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, display: 'block' }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#040e17' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#e8f4f8', marginBottom: 2 }}>Focus Windows</h1>
            <p style={{ fontSize: 13, color: '#6b8fa8' }}>Sprint-equivalent time windows with curated outcomes</p>
          </div>
          <button onClick={() => setNewOpen(true)} style={{ padding: '9px 18px', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + New Window
          </button>
        </div>

        {/* Windows list */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 100, background: '#061c2e', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />)}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          </div>
        ) : windows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏱</div>
            <h3 style={{ color: '#a8ccd8', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No focus windows yet</h3>
            <p style={{ color: '#3a5a6e', fontSize: 13 }}>Create your first focus window to organize your sprint-like periods.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {windows.map(w => {
              const delivered = w.focusOutcomes.filter(fo => fo.outcome.stage === 'DELIVER').length
              const total = w._count.focusOutcomes
              const pct = total > 0 ? (delivered / total) * 100 : 0
              const isSelected = selectedWindow?.id === w.id
              return (
                <div key={w.id} style={{ background: '#061c2e', border: `1px solid ${isSelected ? 'rgba(45,212,191,0.35)' : w.isActive ? 'rgba(45,212,191,0.2)' : 'rgba(45,212,191,0.08)'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  <div
                    style={{ padding: '16px 20px', cursor: 'pointer' }}
                    onClick={() => setSelectedWindow(isSelected ? null : w)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e8f4f8', flex: 1 }}>{w.name}</h3>
                      {w.isActive && <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: '2px 8px', letterSpacing: '0.08em' }}>ACTIVE</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b8fa8', marginBottom: 10 }}>
                      <span>📅 {formatDate(w.startDate)} → {formatDate(w.endDate)}</span>
                      <span>🎯 {total} outcome{total !== 1 ? 's' : ''}</span>
                      <span style={{ color: '#22c55e' }}>✅ {delivered} delivered</span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#2dd4bf', borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#6b8fa8', marginTop: 4 }}>{Math.round(pct)}% delivered</div>
                  </div>

                  {/* Expanded detail */}
                  {isSelected && (
                    <div style={{ borderTop: '1px solid rgba(45,212,191,0.1)', padding: '16px 20px', background: '#040e17' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Outcomes in this window</span>
                        <button onClick={() => setAddOutcomeOpen(true)} style={{ padding: '5px 12px', background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.3)', color: '#2dd4bf', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Add Outcome</button>
                      </div>
                      {w.focusOutcomes.length === 0 ? (
                        <p style={{ fontSize: 13, color: '#3a5a6e', fontStyle: 'italic' }}>No outcomes assigned yet</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {w.focusOutcomes.map(fo => (
                            <div key={fo.outcome.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#061c2e', borderRadius: 8, border: '1px solid rgba(45,212,191,0.08)' }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: SIGNAL_COLORS[fo.outcome.signalStatus], flexShrink: 0 }} />
                              <span style={{ flex: 1, fontSize: 13, color: '#e8f4f8' }}>{fo.outcome.title}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, background: STAGE_COLORS[fo.outcome.stage] + '22', color: STAGE_COLORS[fo.outcome.stage], border: `1px solid ${STAGE_COLORS[fo.outcome.stage]}44`, borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{fo.outcome.stage}</span>
                              <button onClick={() => removeOutcome(fo.outcome.id)} style={{ background: 'none', border: 'none', color: '#3a5a6e', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 2 }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3a5a6e' }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New Window Modal */}
      {newOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,23,0.85)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setNewOpen(false) }}>
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 14, padding: '28px', width: 400, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e8f4f8' }}>New Focus Window</h3>
              <button onClick={() => setNewOpen(false)} style={{ background: 'none', border: 'none', color: '#6b8fa8', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelSt}>Name</label>
              <input style={inputSt} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sprint 1 — Foundation" autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelSt}>Start Date</label>
                <input type="date" style={inputSt} value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label style={labelSt}>End Date</label>
                <input type="date" style={inputSt} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#2dd4bf' }} />
                <span style={{ fontSize: 13, color: '#a8ccd8' }}>Set as active window</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setNewOpen(false)} style={{ flex: 1, padding: '10px 0', background: 'transparent', color: '#6b8fa8', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createWindow} disabled={!name.trim() || !startDate || !endDate || saving} style={{ flex: 2, padding: '10px 0', background: name.trim() ? 'rgba(45,212,191,0.15)' : 'rgba(45,212,191,0.05)', color: name.trim() ? '#2dd4bf' : '#3a5a6e', border: `1px solid ${name.trim() ? 'rgba(45,212,191,0.4)' : 'rgba(45,212,191,0.1)'}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
                {saving ? 'Creating…' : 'Create Window'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Outcome Modal */}
      {addOutcomeOpen && selectedWindow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,23,0.85)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setAddOutcomeOpen(false) }}>
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 14, padding: '24px', width: 420, maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e8f4f8' }}>Add Outcome to Window</h3>
              <button onClick={() => setAddOutcomeOpen(false)} style={{ background: 'none', border: 'none', color: '#6b8fa8', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allOutcomes
                .filter(o => !selectedWindow.focusOutcomes.some(fo => fo.outcome.id === o.id))
                .map(o => (
                  <button key={o.id} onClick={() => { addOutcome(o.id); setAddOutcomeOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#040e17', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(45,212,191,0.3)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(45,212,191,0.1)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: SIGNAL_COLORS[o.signalStatus], flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: '#e8f4f8' }}>{o.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: STAGE_COLORS[o.stage], textTransform: 'uppercase' }}>{o.stage}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, padding: '10px 16px', borderRadius: 8, background: '#061c2e', border: '1px solid rgba(45,212,191,0.4)', color: '#2dd4bf', fontSize: 13, fontWeight: 600 }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
