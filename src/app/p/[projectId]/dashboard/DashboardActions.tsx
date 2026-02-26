'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { Stage, SignalStatus } from '@/types/floq'
import { STAGES, SIGNAL_COLORS } from '@/types/floq'
import { useProject } from '@/contexts/ProjectContext'
import { useRouter } from 'next/navigation'

const RichTextEditor = dynamic(() => import('@/components/editor/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 80, background: '#040e17', border: '1px solid rgba(45,212,191,0.12)', borderRadius: 8 }} />
  ),
})

const SIGNAL_EMOJI: Record<SignalStatus, string> = {
  NORMAL: '🟢', AT_RISK: '🟡', EMERGENCY: '🔴', DELIVERED: '✅',
}

function ImpactDots({ score, onChange }: { score: number; onChange: (n: number) => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          onClick={() => onChange(i)}
          style={{
            width: 22, height: 22, borderRadius: 6,
            background: i <= score ? '#2dd4bf' : 'rgba(45,212,191,0.15)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 11, fontWeight: 700,
            color: i <= score ? '#040e17' : '#6b8fa8',
            border: `1px solid ${i <= score ? '#2dd4bf' : 'rgba(45,212,191,0.2)'}`,
            transition: 'all 0.1s',
          }}
        >
          {i}
        </span>
      ))}
    </span>
  )
}

export default function DashboardActions() {
  const { projectId, workspaceId } = useProject()
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stage, setStage] = useState<Stage>('IDEATE')
  const [signal, setSignal] = useState<SignalStatus>('NORMAL')
  const [impact, setImpact] = useState(3)
  const [aiPair, setAiPair] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function createOutcome() {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          workspaceId,
          projectId,
          stage,
          signalStatus: signal,
          impactScore: impact,
          isAiPair: aiPair,
          description: description || undefined,
        }),
      })
      if (!res.ok) { showToast('Failed to create outcome'); return }
      setShowModal(false)
      setTitle(''); setDescription(''); setStage('IDEATE'); setSignal('NORMAL'); setImpact(3); setAiPair(false)
      showToast('Outcome created ✓')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const inp: React.CSSProperties = {
    background: '#0a1e2e', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8,
    padding: '9px 12px', color: '#e8f4f8', fontSize: 14, outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase',
    letterSpacing: '0.1em', marginBottom: 6, display: 'block',
  }

  return (
    <>
      {/* Quick action buttons */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          padding: '16px 24px',
          background: '#061c2e',
          border: '1px solid rgba(45,212,191,0.1)',
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', alignSelf: 'center', marginRight: 4 }}>Quick Actions</span>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', background: 'rgba(45,212,191,0.12)',
            color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)',
            borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 14 }}>+</span> New Outcome
        </button>
        <Link
          href={`/p/${projectId}/board`}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', background: 'rgba(45,212,191,0.06)',
            color: '#a8ccd8', border: '1px solid rgba(45,212,191,0.15)',
            borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}
        >
          🎯 Open Board →
        </Link>
        <Link
          href={`/p/${projectId}/outcomes`}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', background: 'rgba(45,212,191,0.06)',
            color: '#a8ccd8', border: '1px solid rgba(45,212,191,0.15)',
            borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}
        >
          📋 View All Outcomes →
        </Link>
      </div>

      {/* New Outcome Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(4,14,23,0.88)',
            zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            style={{
              background: '#061c2e', border: '1px solid rgba(45,212,191,0.25)',
              borderRadius: 14, padding: '28px', width: 460, maxWidth: '95vw',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e8f4f8' }}>New Outcome</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#6b8fa8', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Title</label>
              <input
                style={inp} value={title} onChange={e => setTitle(e.target.value)}
                placeholder="What outcome are you driving?" autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) createOutcome() }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Stage</label>
              <select style={{ ...inp, padding: '8px 12px' }} value={stage} onChange={e => setStage(e.target.value as Stage)}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Signal Status</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['NORMAL', 'AT_RISK', 'EMERGENCY'] as SignalStatus[]).map(s => (
                  <button
                    key={s} onClick={() => setSignal(s)}
                    style={{
                      flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${signal === s ? SIGNAL_COLORS[s] : 'rgba(45,212,191,0.15)'}`,
                      background: signal === s ? SIGNAL_COLORS[s] + '22' : 'transparent',
                      color: signal === s ? SIGNAL_COLORS[s] : '#6b8fa8', fontSize: 11, fontWeight: 600,
                    }}
                  >
                    {SIGNAL_EMOJI[s]} {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Impact Score</label>
              <ImpactDots score={impact} onChange={setImpact} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>AI Pair</label>
              <button
                onClick={() => setAiPair(p => !p)}
                style={{
                  padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${aiPair ? 'rgba(99,102,241,0.5)' : 'rgba(45,212,191,0.15)'}`,
                  background: aiPair ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: aiPair ? '#818cf8' : '#6b8fa8', fontSize: 13, fontWeight: 600,
                }}
              >
                {aiPair ? '⚡ Enabled' : 'Disabled — click to enable'}
              </button>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Description <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: '#3a5a6e' }}>(optional)</span></label>
              <RichTextEditor content={description} onChange={setDescription} editable minHeight={80} placeholder="Add context…" />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px 0', background: 'transparent', color: '#6b8fa8', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={createOutcome} disabled={!title.trim() || saving}
                style={{
                  flex: 2, padding: '10px 0',
                  background: title.trim() ? 'rgba(45,212,191,0.15)' : 'rgba(45,212,191,0.05)',
                  color: title.trim() ? '#2dd4bf' : '#3a5a6e',
                  border: `1px solid ${title.trim() ? 'rgba(45,212,191,0.4)' : 'rgba(45,212,191,0.1)'}`,
                  borderRadius: 8, fontSize: 14, fontWeight: 700,
                  cursor: title.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                {saving ? 'Creating…' : 'Create Outcome'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, padding: '10px 16px', borderRadius: 8, background: '#061c2e', border: '1px solid rgba(45,212,191,0.4)', color: '#2dd4bf', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          ✓ {toast}
        </div>
      )}
    </>
  )
}
