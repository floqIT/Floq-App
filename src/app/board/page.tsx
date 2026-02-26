'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserButton } from '@clerk/nextjs'
import useSWR from 'swr'
import type { Outcome, Stage, SignalStatus } from '@/types/floq'
import { STAGES, STAGE_COLORS, SIGNAL_COLORS, NEXT_STAGE } from '@/types/floq'

// ─── SWR fetcher ──────────────────────────────────────────────────────────────
const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error('Failed to fetch outcomes')
    return r.json()
  })

// ─── Toast ────────────────────────────────────────────────────────────────────
interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

// ─── Seed data (demo / fallback while workspace initialises) ─────────────────
const SEED_OUTCOMES: Outcome[] = [
  {
    id: '1', title: 'Voice scheduling with Retell AI', stage: 'BUILD', signalStatus: 'NORMAL',
    impactScore: 5, isAiPair: true, workspaceId: 'demo', createdById: 'demo',
    createdAt: '2025-01-10T00:00:00Z', updatedAt: '2025-02-10T00:00:00Z', stageChangedAt: '2025-02-10T00:00:00Z',
  },
  {
    id: '2', title: 'WhatsApp Business API integration', stage: 'SHAPE', signalStatus: 'AT_RISK',
    impactScore: 4, isAiPair: false, workspaceId: 'demo', createdById: 'demo',
    createdAt: '2025-01-15T00:00:00Z', updatedAt: '2025-02-05T00:00:00Z', stageChangedAt: '2025-02-05T00:00:00Z',
  },
  {
    id: '3', title: 'Mobile app — Android MVP', stage: 'IDENTIFY', signalStatus: 'NORMAL',
    impactScore: 5, isAiPair: false, workspaceId: 'demo', createdById: 'demo',
    createdAt: '2025-01-18T00:00:00Z', updatedAt: '2025-01-28T00:00:00Z', stageChangedAt: '2025-01-28T00:00:00Z',
  },
  {
    id: '4', title: 'Investor pitch deck v2', stage: 'IDEATE', signalStatus: 'NORMAL',
    impactScore: 3, isAiPair: true, workspaceId: 'demo', createdById: 'demo',
    createdAt: '2025-02-12T00:00:00Z', updatedAt: '2025-02-12T00:00:00Z', stageChangedAt: '2025-02-12T00:00:00Z',
  },
  {
    id: '5', title: 'Firebase push notifications', stage: 'BUILD', signalStatus: 'EMERGENCY',
    impactScore: 4, isAiPair: false, workspaceId: 'demo', createdById: 'demo',
    createdAt: '2025-01-22T00:00:00Z', updatedAt: '2025-02-08T00:00:00Z', stageChangedAt: '2025-02-08T00:00:00Z',
  },
  {
    id: '6', title: 'Customer onboarding flow', stage: 'SHIP', signalStatus: 'NORMAL',
    impactScore: 4, isAiPair: false, workspaceId: 'demo', createdById: 'demo',
    createdAt: '2025-01-05T00:00:00Z', updatedAt: '2025-02-15T00:00:00Z', stageChangedAt: '2025-02-15T00:00:00Z',
  },
]

// ─── Signal emoji map ─────────────────────────────────────────────────────────
const SIGNAL_EMOJI: Record<SignalStatus, string> = {
  NORMAL: '🟢',
  AT_RISK: '🟡',
  EMERGENCY: '🔴',
  DELIVERED: '✅',
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ImpactDots({ score }: { score: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: i <= score ? '#2dd4bf' : 'rgba(45,212,191,0.2)',
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  )
}

function OutcomeCard({
  outcome,
  onClick,
  onAdvance,
}: {
  outcome: Outcome
  onClick: () => void
  onAdvance: () => void
}) {
  const isEmergency = outcome.signalStatus === 'EMERGENCY'
  const stageIdx = STAGES.indexOf(outcome.stage)
  const canAdvance = stageIdx < STAGES.length - 1

  return (
    <div
      style={{
        background: '#061c2e',
        border: `1px solid ${isEmergency ? 'rgba(239,68,68,0.5)' : 'rgba(45,212,191,0.1)'}`,
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.1s',
        userSelect: 'none',
      }}
      onClick={onClick}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = STAGE_COLORS[outcome.stage] + '66'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = isEmergency
          ? 'rgba(239,68,68,0.5)'
          : 'rgba(45,212,191,0.1)'
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e8f4f8', lineHeight: 1.3, flex: 1, marginRight: 8 }}>
          {outcome.title}
        </span>
        <span title={outcome.signalStatus} style={{ fontSize: 14, flexShrink: 0 }}>
          {SIGNAL_EMOJI[outcome.signalStatus]}
        </span>
      </div>

      {/* Impact + AI badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <ImpactDots score={outcome.impactScore} />
        {outcome.isAiPair && (
          <span
            style={{
              fontSize: 10, fontWeight: 700,
              background: 'rgba(99,102,241,0.2)', color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.4)', borderRadius: 4,
              padding: '1px 6px', letterSpacing: '0.05em',
            }}
          >
            ⚡ AI
          </span>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 10, fontWeight: 700,
            background: STAGE_COLORS[outcome.stage] + '22',
            color: STAGE_COLORS[outcome.stage],
            border: `1px solid ${STAGE_COLORS[outcome.stage]}44`,
            borderRadius: 4, padding: '2px 7px',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}
        >
          {outcome.stage}
        </span>
        {canAdvance && (
          <button
            onClick={e => { e.stopPropagation(); onAdvance() }}
            title={`Advance to ${STAGES[stageIdx + 1]}`}
            style={{
              fontSize: 14,
              background: 'rgba(45,212,191,0.1)', color: '#2dd4bf',
              border: '1px solid rgba(45,212,191,0.3)', borderRadius: 6,
              width: 26, height: 26,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,212,191,0.25)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,212,191,0.1)' }}
          >
            →
          </button>
        )}
      </div>
    </div>
  )
}

function DetailPanel({
  outcome,
  onClose,
  onAdvance,
  onRetreat,
}: {
  outcome: Outcome
  onClose: () => void
  onAdvance: () => void
  onRetreat: () => void
}) {
  const stageIdx = STAGES.indexOf(outcome.stage)
  return (
    <div
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 380,
        background: '#061c2e', borderLeft: '1px solid rgba(45,212,191,0.2)',
        zIndex: 100, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(45,212,191,0.15)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11, fontWeight: 700, color: STAGE_COLORS[outcome.stage],
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
            }}
          >
            {outcome.stage}
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#e8f4f8', lineHeight: 1.3 }}>
            {outcome.title}
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#a8ccd8', fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {/* Details */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {/* Signal */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Signal Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: SIGNAL_COLORS[outcome.signalStatus], display: 'inline-block',
              }}
            />
            <span style={{ fontWeight: 600, color: SIGNAL_COLORS[outcome.signalStatus] }}>
              {outcome.signalStatus}
            </span>
          </div>
        </div>

        {/* Impact */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Impact Score
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ImpactDots score={outcome.impactScore} />
            <span style={{ fontSize: 13, color: '#a8ccd8' }}>{outcome.impactScore} / 5</span>
          </div>
        </div>

        {/* AI Pair */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            AI Pair
          </div>
          <span
            style={{
              fontSize: 12, fontWeight: 700,
              background: outcome.isAiPair ? 'rgba(99,102,241,0.2)' : 'rgba(100,100,100,0.15)',
              color: outcome.isAiPair ? '#818cf8' : '#6b8fa8',
              border: `1px solid ${outcome.isAiPair ? 'rgba(99,102,241,0.4)' : 'rgba(100,100,100,0.3)'}`,
              borderRadius: 5, padding: '3px 10px',
            }}
          >
            {outcome.isAiPair ? '⚡ Active' : 'Disabled'}
          </span>
        </div>

        {/* Target metric */}
        {outcome.targetMetric && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Target Metric
            </div>
            <p style={{ fontSize: 13, color: '#a8ccd8', lineHeight: 1.5 }}>{outcome.targetMetric}</p>
          </div>
        )}

        {/* Assignee */}
        {outcome.assignee && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Assignee
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {outcome.assignee.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={outcome.assignee.avatarUrl} alt={outcome.assignee.name} style={{ width: 28, height: 28, borderRadius: '50%' }} />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(45,212,191,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#2dd4bf', fontWeight: 700 }}>
                  {outcome.assignee.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 13, color: '#a8ccd8' }}>{outcome.assignee.name}</span>
            </div>
          </div>
        )}

        {/* Signal & comment counts */}
        {outcome._count && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#6b8fa8' }}>
              <span style={{ fontWeight: 700, color: '#a8ccd8' }}>{outcome._count.signals}</span> signals
            </div>
            <div style={{ fontSize: 12, color: '#6b8fa8' }}>
              <span style={{ fontWeight: 700, color: '#a8ccd8' }}>{outcome._count.comments}</span> comments
            </div>
          </div>
        )}

        {/* Stage timeline */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Stage Timeline
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STAGES.slice(0, STAGES.indexOf(outcome.stage) + 1).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: s === outcome.stage ? STAGE_COLORS[s] : STAGE_COLORS[s] + '66',
                    flexShrink: 0, display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    fontSize: 12, fontWeight: 600,
                    color: s === outcome.stage ? STAGE_COLORS[s] : STAGE_COLORS[s] + 'aa',
                    width: 80,
                  }}
                >
                  {s}
                </span>
                {s === outcome.stage && outcome.stageChangedAt && (
                  <span style={{ fontSize: 11, color: '#6b8fa8' }}>
                    {new Date(outcome.stageChangedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(45,212,191,0.15)', display: 'flex', gap: 10 }}>
        <button
          onClick={onRetreat}
          disabled={stageIdx === 0}
          style={{
            flex: 1, padding: '9px 0',
            background: 'rgba(107,143,168,0.1)',
            color: stageIdx === 0 ? '#3a5a6e' : '#a8ccd8',
            border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8,
            cursor: stageIdx === 0 ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'background 0.15s',
          }}
        >
          ← Retreat
        </button>
        <button
          onClick={onAdvance}
          disabled={stageIdx === STAGES.length - 1}
          style={{
            flex: 1, padding: '9px 0',
            background: stageIdx === STAGES.length - 1 ? 'rgba(45,212,191,0.05)' : 'rgba(45,212,191,0.15)',
            color: stageIdx === STAGES.length - 1 ? '#3a5a6e' : '#2dd4bf',
            border: `1px solid ${stageIdx === STAGES.length - 1 ? 'rgba(45,212,191,0.1)' : 'rgba(45,212,191,0.35)'}`,
            borderRadius: 8,
            cursor: stageIdx === STAGES.length - 1 ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'background 0.15s',
          }}
        >
          Advance →
        </button>
      </div>
    </div>
  )
}

interface NewOutcomeModalProps {
  defaultStage: Stage
  workspaceId: string | null
  onClose: () => void
  onSave: (title: string, stage: Stage, impactScore: number, isAiPair: boolean, signalStatus: SignalStatus) => Promise<void>
}

function NewOutcomeModal({ defaultStage, onClose, onSave }: NewOutcomeModalProps) {
  const [title, setTitle] = useState('')
  const [stage, setStage] = useState<Stage>(defaultStage)
  const [impactScore, setImpactScore] = useState(3)
  const [isAiPair, setIsAiPair] = useState(false)
  const [signalStatus, setSignalStatus] = useState<SignalStatus>('NORMAL')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      await onSave(title.trim(), stage, impactScore, isAiPair, signalStatus)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', background: '#0a1e2e',
    border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8,
    padding: '9px 12px', color: '#e8f4f8', fontSize: 14, outline: 'none',
    boxSizing: 'border-box' as const,
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#6b8fa8',
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, display: 'block',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,23,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 14, padding: '28px 28px 24px', width: 420, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e8f4f8' }}>New Outcome</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b8fa8', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Title</label>
          <input
            style={inputStyle}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What outcome are you driving?"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          />
        </div>

        {/* Stage */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Stage</label>
          <select style={inputStyle} value={stage} onChange={e => setStage(e.target.value as Stage)}>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Signal */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Signal Status</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['NORMAL', 'AT_RISK', 'EMERGENCY'] as SignalStatus[]).map(s => (
              <button
                key={s}
                onClick={() => setSignalStatus(s)}
                style={{
                  padding: '6px 12px', borderRadius: 7,
                  border: `1px solid ${signalStatus === s ? SIGNAL_COLORS[s] : 'rgba(45,212,191,0.15)'}`,
                  background: signalStatus === s ? SIGNAL_COLORS[s] + '22' : 'transparent',
                  color: signalStatus === s ? SIGNAL_COLORS[s] : '#6b8fa8',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {SIGNAL_EMOJI[s]} {s}
              </button>
            ))}
          </div>
        </div>

        {/* Impact */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Impact Score</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setImpactScore(n)}
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  border: `1px solid ${n <= impactScore ? '#2dd4bf' : 'rgba(45,212,191,0.15)'}`,
                  background: n <= impactScore ? 'rgba(45,212,191,0.2)' : 'transparent',
                  color: n <= impactScore ? '#2dd4bf' : '#6b8fa8',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* AI Pair toggle */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>AI Pair</label>
          <button
            onClick={() => setIsAiPair(!isAiPair)}
            style={{
              padding: '7px 14px', borderRadius: 8,
              border: `1px solid ${isAiPair ? 'rgba(99,102,241,0.5)' : 'rgba(45,212,191,0.15)'}`,
              background: isAiPair ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: isAiPair ? '#818cf8' : '#6b8fa8',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {isAiPair ? '⚡ Enabled' : 'Disabled — click to enable'}
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '10px 0', background: 'transparent', color: '#6b8fa8', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            style={{
              flex: 2, padding: '10px 0',
              background: title.trim() && !saving ? 'rgba(45,212,191,0.15)' : 'rgba(45,212,191,0.05)',
              color: title.trim() && !saving ? '#2dd4bf' : '#3a5a6e',
              border: `1px solid ${title.trim() && !saving ? 'rgba(45,212,191,0.4)' : 'rgba(45,212,191,0.1)'}`,
              borderRadius: 8, fontSize: 14, fontWeight: 700,
              cursor: title.trim() && !saving ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Creating…' : 'Create Outcome'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Board skeleton (shown while workspace initialises) ───────────────────────
function BoardSkeleton() {
  const cols = Array.from({ length: 8 })
  const cards = Array.from({ length: 2 })
  return (
    <div style={{ flex: 1, display: 'flex', gap: 12, padding: '16px', overflowX: 'auto', overflowY: 'hidden' }}>
      {cols.map((_, i) => (
        <div key={i} style={{ minWidth: 220, flex: '0 0 240px', background: '#061420', borderRadius: 12, border: '1px solid rgba(45,212,191,0.08)', padding: '12px 10px' }}>
          <div style={{ height: 18, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 12, animation: 'pulse 1.5s infinite' }} />
          {cards.map((_, j) => (
            <div key={j} style={{ height: 76, background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 8, animation: 'pulse 1.5s infinite', animationDelay: `${j * 0.1}s` }} />
          ))}
        </div>
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}

// ─── Board Page ────────────────────────────────────────────────────────────────
export default function BoardPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [initDone, setInitDone] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addingForStage, setAddingForStage] = useState<Stage | null>(null)

  // ── Toast helpers ────────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  // ── Workspace init ────────────────────────────────────────────────────────────
  useEffect(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('floq_workspaceId') : null
    if (cached) {
      setWorkspaceId(cached)
      setInitDone(true)
      return
    }
    fetch('/api/workspace/init')
      .then(r => r.json())
      .then(data => {
        if (data.workspaceId) {
          localStorage.setItem('floq_workspaceId', data.workspaceId)
          setWorkspaceId(data.workspaceId)
        } else {
          setInitError(data.error ?? 'Failed to init workspace')
        }
      })
      .catch(() => setInitError('Failed to connect to workspace'))
      .finally(() => setInitDone(true))
  }, [])

  // ── SWR outcomes fetch ────────────────────────────────────────────────────────
  const { data: outcomes, mutate, isLoading } = useSWR<Outcome[]>(
    workspaceId ? `/api/outcomes?workspaceId=${workspaceId}` : null,
    fetcher,
    { refreshInterval: 30000 },
  )

  // Use real data when available, seed data while loading/unauthenticated
  const displayOutcomes: Outcome[] = outcomes ?? SEED_OUTCOMES
  const isDemo = !workspaceId || (!outcomes && isLoading)

  const selectedOutcome = displayOutcomes.find(o => o.id === selectedId) ?? null

  // ── Advance stage ─────────────────────────────────────────────────────────────
  const advanceStage = async (outcome: Outcome) => {
    const nextStage = NEXT_STAGE[outcome.stage]
    if (!nextStage || !workspaceId) return

    // Optimistic update
    const optimistic = displayOutcomes.map(o =>
      o.id === outcome.id ? { ...o, stage: nextStage } : o
    )
    mutate(optimistic, false)

    try {
      const res = await fetch(`/api/outcomes/${outcome.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: nextStage }),
      })
      if (!res.ok) throw new Error('Failed to advance stage')
      addToast(`"${outcome.title.slice(0, 30)}" → ${nextStage}`)
      mutate()
    } catch {
      mutate() // rollback
      addToast('Failed to move outcome', 'error')
    }
  }

  // ── Retreat stage ─────────────────────────────────────────────────────────────
  const retreatStage = async (outcome: Outcome) => {
    const idx = STAGES.indexOf(outcome.stage)
    if (idx <= 0 || !workspaceId) return
    const prevStage = STAGES[idx - 1]

    // Optimistic update
    const optimistic = displayOutcomes.map(o =>
      o.id === outcome.id ? { ...o, stage: prevStage } : o
    )
    mutate(optimistic, false)

    try {
      const res = await fetch(`/api/outcomes/${outcome.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: prevStage }),
      })
      if (!res.ok) throw new Error('Failed to retreat stage')
      addToast(`"${outcome.title.slice(0, 30)}" ← ${prevStage}`)
      mutate()
    } catch {
      mutate() // rollback
      addToast('Failed to move outcome', 'error')
    }
  }

  // ── Add outcome ────────────────────────────────────────────────────────────────
  const addOutcome = async (
    title: string,
    stage: Stage,
    impactScore: number,
    isAiPair: boolean,
    signalStatus: SignalStatus,
  ) => {
    if (!workspaceId) return
    const res = await fetch('/api/outcomes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, stage, impactScore, isAiPair, signalStatus, workspaceId }),
    })
    if (!res.ok) {
      addToast('Failed to create outcome', 'error')
      throw new Error('Failed to create outcome')
    }
    const created = await res.json()
    mutate([...(outcomes ?? []), created], false)
    addToast(`"${title.slice(0, 30)}" added to ${stage}`)
    setAddingForStage(null)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#040e17', overflow: 'hidden' }}>
      {/* ── Navbar ── */}
      <header
        style={{
          height: 56, background: '#061420',
          borderBottom: '1px solid rgba(45,212,191,0.15)',
          display: 'flex', alignItems: 'center', paddingInline: 24, gap: 16,
          flexShrink: 0, zIndex: 50,
        }}
      >
        <span
          style={{
            fontSize: 20, fontWeight: 900, color: '#2dd4bf',
            fontFamily: 'var(--font-sora)', letterSpacing: '-0.02em',
          }}
        >
          FLOQ
        </span>
        <span style={{ fontSize: 12, color: 'rgba(45,212,191,0.5)', fontWeight: 600 }}>|</span>
        <span style={{ fontSize: 13, color: '#a8ccd8', fontWeight: 500 }}>Outcome Flow Board</span>
        {isDemo && (
          <span
            style={{
              marginLeft: 8, fontSize: 10, fontWeight: 700,
              background: 'rgba(45,212,191,0.1)', color: '#2dd4bf',
              border: '1px solid rgba(45,212,191,0.3)', borderRadius: 20,
              padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            DEMO
          </span>
        )}
        <div style={{ flex: 1 }} />
        {initError && (
          <span style={{ fontSize: 12, color: '#ef4444', marginRight: 8 }}>
            ⚠ {initError}
          </span>
        )}
        <UserButton afterSignOutUrl="/sign-in" />
      </header>

      {/* ── Board body ── */}
      {!initDone ? (
        <BoardSkeleton />
      ) : (
        <div
          style={{
            flex: 1, display: 'flex', overflowX: 'auto', overflowY: 'hidden',
            padding: '16px 16px 16px', gap: 12,
          }}
        >
          {STAGES.map(stage => {
            const stageOutcomes = displayOutcomes.filter(o => o.stage === stage)
            const color = STAGE_COLORS[stage]
            return (
              <div
                key={stage}
                style={{
                  minWidth: 220, maxWidth: 260, flex: '0 0 240px',
                  display: 'flex', flexDirection: 'column',
                  background: '#061420', borderRadius: 12,
                  border: '1px solid rgba(45,212,191,0.08)', overflow: 'hidden',
                }}
              >
                {/* Column header */}
                <div
                  style={{
                    padding: '12px 14px 10px',
                    borderBottom: `2px solid ${color}33`,
                    background: `linear-gradient(180deg, ${color}11 0%, transparent 100%)`,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 800, color,
                        textTransform: 'uppercase', letterSpacing: '0.12em',
                      }}
                    >
                      {stage}
                    </span>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 700,
                        background: color + '22', color, borderRadius: 20,
                        padding: '1px 7px', border: `1px solid ${color}44`,
                      }}
                    >
                      {stageOutcomes.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div
                  style={{
                    flex: 1, overflowY: 'auto', padding: '10px 10px 0',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}
                >
                  {stageOutcomes.map(o => (
                    <OutcomeCard
                      key={o.id}
                      outcome={o}
                      onClick={() => setSelectedId(o.id)}
                      onAdvance={() => advanceStage(o)}
                    />
                  ))}
                  {stageOutcomes.length === 0 && (
                    <div
                      style={{
                        textAlign: 'center', padding: '20px 0',
                        color: '#2a4a5e', fontSize: 12, fontStyle: 'italic',
                      }}
                    >
                      No outcomes yet
                    </div>
                  )}
                </div>

                {/* Add button */}
                <div style={{ padding: 10, flexShrink: 0 }}>
                  <button
                    onClick={() => setAddingForStage(stage)}
                    style={{
                      width: '100%', padding: '8px 0', background: 'transparent',
                      color: color + 'aa', border: `1px dashed ${color}44`, borderRadius: 8,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.15s', letterSpacing: '0.04em',
                    }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.background = color + '11'
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = color + '88'
                      ;(e.currentTarget as HTMLButtonElement).style.color = color
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = color + '44'
                      ;(e.currentTarget as HTMLButtonElement).style.color = color + 'aa'
                    }}
                  >
                    + Add
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Detail panel ── */}
      {selectedOutcome && (
        <>
          <div
            onClick={() => setSelectedId(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          />
          <DetailPanel
            outcome={selectedOutcome}
            onClose={() => setSelectedId(null)}
            onAdvance={() => advanceStage(selectedOutcome)}
            onRetreat={() => retreatStage(selectedOutcome)}
          />
        </>
      )}

      {/* ── New Outcome Modal ── */}
      {addingForStage && (
        <NewOutcomeModal
          defaultStage={addingForStage}
          workspaceId={workspaceId}
          onClose={() => setAddingForStage(null)}
          onSave={addOutcome}
        />
      )}

      {/* ── Toast overlay ── */}
      <div
        style={{
          position: 'fixed', bottom: 24, right: 24,
          zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              padding: '10px 16px', borderRadius: 8,
              background: t.type === 'success' ? '#061c2e' : '#1a0a0a',
              border: `1px solid ${t.type === 'success' ? 'rgba(45,212,191,0.4)' : 'rgba(239,68,68,0.4)'}`,
              color: t.type === 'success' ? '#2dd4bf' : '#ef4444',
              fontSize: 13, fontWeight: 600,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              animation: 'slideIn 0.2s ease',
              maxWidth: 320,
            }}
          >
            {t.type === 'success' ? '✓ ' : '✕ '}{t.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
