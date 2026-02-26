'use client'

import { useState } from 'react'
import { UserButton } from '@clerk/nextjs'

// ─── Types ────────────────────────────────────────────────────────────────────
type SignalStatus = 'NORMAL' | 'AT_RISK' | 'EMERGENCY' | 'DELIVERED'
type Stage = 'IDEATE' | 'IDENTIFY' | 'SHAPE' | 'BUILD' | 'SHIP' | 'MEASURE' | 'DELIVER' | 'PIVOT'

interface Outcome {
  id: string
  title: string
  stage: Stage
  signalStatus: SignalStatus
  impactScore: number
  isAiPair: boolean
  history?: { stage: Stage; at: string }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES: Stage[] = ['IDEATE', 'IDENTIFY', 'SHAPE', 'BUILD', 'SHIP', 'MEASURE', 'DELIVER', 'PIVOT']

const STAGE_COLORS: Record<Stage, string> = {
  IDEATE: '#6366f1',
  IDENTIFY: '#8b5cf6',
  SHAPE: '#ec4899',
  BUILD: '#f59e0b',
  SHIP: '#10b981',
  MEASURE: '#3b82f6',
  DELIVER: '#2dd4bf',
  PIVOT: '#ef4444',
}

const SIGNAL_COLORS: Record<SignalStatus, string> = {
  NORMAL: '#22c55e',
  AT_RISK: '#f59e0b',
  EMERGENCY: '#ef4444',
  DELIVERED: '#2dd4bf',
}

const SIGNAL_EMOJI: Record<SignalStatus, string> = {
  NORMAL: '🟢',
  AT_RISK: '🟡',
  EMERGENCY: '🔴',
  DELIVERED: '✅',
}

const SEED_OUTCOMES: Outcome[] = [
  { id: '1', title: 'Voice scheduling with Retell AI', stage: 'BUILD', signalStatus: 'NORMAL', impactScore: 5, isAiPair: true, history: [{ stage: 'IDEATE', at: '2025-01-10' }, { stage: 'IDENTIFY', at: '2025-01-20' }, { stage: 'SHAPE', at: '2025-02-01' }, { stage: 'BUILD', at: '2025-02-10' }] },
  { id: '2', title: 'WhatsApp Business API integration', stage: 'SHAPE', signalStatus: 'AT_RISK', impactScore: 4, isAiPair: false, history: [{ stage: 'IDEATE', at: '2025-01-15' }, { stage: 'IDENTIFY', at: '2025-01-25' }, { stage: 'SHAPE', at: '2025-02-05' }] },
  { id: '3', title: 'Mobile app — Android MVP', stage: 'IDENTIFY', signalStatus: 'NORMAL', impactScore: 5, isAiPair: false, history: [{ stage: 'IDEATE', at: '2025-01-18' }, { stage: 'IDENTIFY', at: '2025-01-28' }] },
  { id: '4', title: 'Investor pitch deck v2', stage: 'IDEATE', signalStatus: 'NORMAL', impactScore: 3, isAiPair: true, history: [{ stage: 'IDEATE', at: '2025-02-12' }] },
  { id: '5', title: 'Firebase push notifications', stage: 'BUILD', signalStatus: 'EMERGENCY', impactScore: 4, isAiPair: false, history: [{ stage: 'IDEATE', at: '2025-01-22' }, { stage: 'BUILD', at: '2025-02-08' }] },
  { id: '6', title: 'Customer onboarding flow', stage: 'SHIP', signalStatus: 'NORMAL', impactScore: 4, isAiPair: false, history: [{ stage: 'IDEATE', at: '2025-01-05' }, { stage: 'SHIP', at: '2025-02-15' }] },
]

// ─── Sub-components ────────────────────────────────────────────────────────────
function ImpactDots({ score }: { score: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i <= score ? '#2dd4bf' : 'rgba(45,212,191,0.2)', display: 'inline-block' }} />
      ))}
    </span>
  )
}

function OutcomeCard({ outcome, onClick, onAdvance }: { outcome: Outcome; onClick: () => void; onAdvance: () => void }) {
  const isEmergency = outcome.signalStatus === 'EMERGENCY'
  const stageIdx = STAGES.indexOf(outcome.stage)
  const canAdvance = stageIdx < STAGES.length - 1

  return (
    <div
      className={isEmergency ? 'emergency-card' : undefined}
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
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = STAGE_COLORS[outcome.stage] + '66' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = isEmergency ? 'rgba(239,68,68,0.5)' : 'rgba(45,212,191,0.1)' }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e8f4f8', lineHeight: 1.3, flex: 1, marginRight: 8 }}>{outcome.title}</span>
        <span title={outcome.signalStatus} style={{ fontSize: 14, flexShrink: 0 }}>{SIGNAL_EMOJI[outcome.signalStatus]}</span>
      </div>

      {/* Impact + AI badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <ImpactDots score={outcome.impactScore} />
        {outcome.isAiPair && (
          <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 4, padding: '1px 6px', letterSpacing: '0.05em' }}>⚡ AI</span>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, background: STAGE_COLORS[outcome.stage] + '22', color: STAGE_COLORS[outcome.stage], border: `1px solid ${STAGE_COLORS[outcome.stage]}44`, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {outcome.stage}
        </span>
        {canAdvance && (
          <button
            onClick={e => { e.stopPropagation(); onAdvance() }}
            title={`Advance to ${STAGES[stageIdx + 1]}`}
            style={{ fontSize: 14, background: 'rgba(45,212,191,0.1)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,212,191,0.25)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,212,191,0.1)' }}
          >→</button>
        )}
      </div>
    </div>
  )
}

function DetailPanel({ outcome, onClose, onAdvance, onRetreat }: { outcome: Outcome; onClose: () => void; onAdvance: () => void; onRetreat: () => void }) {
  const stageIdx = STAGES.indexOf(outcome.stage)
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, background: '#061c2e', borderLeft: '1px solid rgba(45,212,191,0.2)', zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.5)' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(45,212,191,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: STAGE_COLORS[outcome.stage], textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{outcome.stage}</div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#e8f4f8', lineHeight: 1.3 }}>{outcome.title}</h2>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a8ccd8', fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
      </div>

      {/* Details */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {/* Signal */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Signal Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: SIGNAL_COLORS[outcome.signalStatus], display: 'inline-block' }} />
            <span style={{ fontWeight: 600, color: SIGNAL_COLORS[outcome.signalStatus] }}>{outcome.signalStatus}</span>
          </div>
        </div>

        {/* Impact */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Impact Score</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ImpactDots score={outcome.impactScore} />
            <span style={{ fontSize: 13, color: '#a8ccd8' }}>{outcome.impactScore} / 5</span>
          </div>
        </div>

        {/* AI Pair */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>AI Pair</div>
          <span style={{ fontSize: 12, fontWeight: 700, background: outcome.isAiPair ? 'rgba(99,102,241,0.2)' : 'rgba(100,100,100,0.15)', color: outcome.isAiPair ? '#818cf8' : '#6b8fa8', border: `1px solid ${outcome.isAiPair ? 'rgba(99,102,241,0.4)' : 'rgba(100,100,100,0.3)'}`, borderRadius: 5, padding: '3px 10px' }}>
            {outcome.isAiPair ? '⚡ Active' : 'Disabled'}
          </span>
        </div>

        {/* Stage history */}
        {outcome.history && outcome.history.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Stage History</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {outcome.history.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLORS[h.stage], flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: STAGE_COLORS[h.stage], width: 80 }}>{h.stage}</span>
                  <span style={{ fontSize: 11, color: '#6b8fa8' }}>{h.at}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(45,212,191,0.15)', display: 'flex', gap: 10 }}>
        <button
          onClick={onRetreat}
          disabled={stageIdx === 0}
          style={{ flex: 1, padding: '9px 0', background: 'rgba(107,143,168,0.1)', color: stageIdx === 0 ? '#3a5a6e' : '#a8ccd8', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8, cursor: stageIdx === 0 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, transition: 'background 0.15s' }}
        >← Retreat</button>
        <button
          onClick={onAdvance}
          disabled={stageIdx === STAGES.length - 1}
          style={{ flex: 1, padding: '9px 0', background: stageIdx === STAGES.length - 1 ? 'rgba(45,212,191,0.05)' : 'rgba(45,212,191,0.15)', color: stageIdx === STAGES.length - 1 ? '#3a5a6e' : '#2dd4bf', border: `1px solid ${stageIdx === STAGES.length - 1 ? 'rgba(45,212,191,0.1)' : 'rgba(45,212,191,0.35)'}`, borderRadius: 8, cursor: stageIdx === STAGES.length - 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, transition: 'background 0.15s' }}
        >Advance →</button>
      </div>
    </div>
  )
}

interface NewOutcomeModalProps {
  defaultStage: Stage
  onClose: () => void
  onSave: (o: Outcome) => void
}

function NewOutcomeModal({ defaultStage, onClose, onSave }: NewOutcomeModalProps) {
  const [title, setTitle] = useState('')
  const [stage, setStage] = useState<Stage>(defaultStage)
  const [impactScore, setImpactScore] = useState(3)
  const [isAiPair, setIsAiPair] = useState(false)
  const [signalStatus, setSignalStatus] = useState<SignalStatus>('NORMAL')

  function handleSave() {
    if (!title.trim()) return
    onSave({
      id: Date.now().toString(),
      title: title.trim(),
      stage,
      signalStatus,
      impactScore,
      isAiPair,
      history: [{ stage, at: new Date().toISOString().slice(0, 10) }],
    })
  }

  const inputStyle = { width: '100%', background: '#0a1e2e', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8, padding: '9px 12px', color: '#e8f4f8', fontSize: 14, outline: 'none' }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,23,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 14, padding: '28px 28px 24px', width: 420, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e8f4f8' }}>New Outcome</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b8fa8', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="What outcome are you driving?" autoFocus />
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            {(['NORMAL','AT_RISK','EMERGENCY'] as SignalStatus[]).map(s => (
              <button key={s} onClick={() => setSignalStatus(s)} style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${signalStatus === s ? SIGNAL_COLORS[s] : 'rgba(45,212,191,0.15)'}`, background: signalStatus === s ? SIGNAL_COLORS[s] + '22' : 'transparent', color: signalStatus === s ? SIGNAL_COLORS[s] : '#6b8fa8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {SIGNAL_EMOJI[s]} {s}
              </button>
            ))}
          </div>
        </div>

        {/* Impact */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Impact Score</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setImpactScore(n)} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${n <= impactScore ? '#2dd4bf' : 'rgba(45,212,191,0.15)'}`, background: n <= impactScore ? 'rgba(45,212,191,0.2)' : 'transparent', color: n <= impactScore ? '#2dd4bf' : '#6b8fa8', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* AI Pair toggle */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>AI Pair</label>
          <button onClick={() => setIsAiPair(!isAiPair)} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${isAiPair ? 'rgba(99,102,241,0.5)' : 'rgba(45,212,191,0.15)'}`, background: isAiPair ? 'rgba(99,102,241,0.2)' : 'transparent', color: isAiPair ? '#818cf8' : '#6b8fa8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {isAiPair ? '⚡ Enabled' : 'Disabled — click to enable'}
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', background: 'transparent', color: '#6b8fa8', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={!title.trim()} style={{ flex: 2, padding: '10px 0', background: title.trim() ? 'rgba(45,212,191,0.15)' : 'rgba(45,212,191,0.05)', color: title.trim() ? '#2dd4bf' : '#3a5a6e', border: `1px solid ${title.trim() ? 'rgba(45,212,191,0.4)' : 'rgba(45,212,191,0.1)'}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: title.trim() ? 'pointer' : 'not-allowed' }}>
            Create Outcome
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Board ─────────────────────────────────────────────────────────────────────
export default function BoardPage() {
  const [outcomes, setOutcomes] = useState<Outcome[]>(SEED_OUTCOMES)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addingForStage, setAddingForStage] = useState<Stage | null>(null)

  const selectedOutcome = outcomes.find(o => o.id === selectedId) || null

  function advanceStage(id: string) {
    setOutcomes(prev => prev.map(o => {
      if (o.id !== id) return o
      const idx = STAGES.indexOf(o.stage)
      if (idx >= STAGES.length - 1) return o
      const newStage = STAGES[idx + 1]
      return { ...o, stage: newStage, history: [...(o.history || []), { stage: newStage, at: new Date().toISOString().slice(0, 10) }] }
    }))
  }

  function retreatStage(id: string) {
    setOutcomes(prev => prev.map(o => {
      if (o.id !== id) return o
      const idx = STAGES.indexOf(o.stage)
      if (idx <= 0) return o
      const newStage = STAGES[idx - 1]
      return { ...o, stage: newStage, history: [...(o.history || []), { stage: newStage, at: new Date().toISOString().slice(0, 10) }] }
    }))
  }

  function addOutcome(o: Outcome) {
    setOutcomes(prev => [...prev, o])
    setAddingForStage(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#040e17', overflow: 'hidden' }}>
      {/* Navbar */}
      <header style={{ height: 56, background: '#061420', borderBottom: '1px solid rgba(45,212,191,0.15)', display: 'flex', alignItems: 'center', paddingInline: 24, gap: 16, flexShrink: 0, zIndex: 50 }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#2dd4bf', fontFamily: 'var(--font-sora)', letterSpacing: '-0.02em' }}>FLOQ</span>
        <span style={{ fontSize: 12, color: 'rgba(45,212,191,0.5)', fontWeight: 600 }}>|</span>
        <span style={{ fontSize: 13, color: '#a8ccd8', fontWeight: 500 }}>Outcome Flow Board</span>
        <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: 'rgba(45,212,191,0.1)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 20, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>DEMO</span>
        <div style={{ flex: 1 }} />
        <UserButton afterSignOutUrl="/sign-in" />
      </header>

      {/* Board columns */}
      <div style={{ flex: 1, display: 'flex', overflowX: 'auto', overflowY: 'hidden', padding: '16px 16px 16px', gap: 12 }}>
        {STAGES.map(stage => {
          const stageOutcomes = outcomes.filter(o => o.stage === stage)
          const color = STAGE_COLORS[stage]
          return (
            <div key={stage} style={{ minWidth: 220, maxWidth: 260, flex: '0 0 240px', display: 'flex', flexDirection: 'column', background: '#061420', borderRadius: 12, border: '1px solid rgba(45,212,191,0.08)', overflow: 'hidden' }}>
              {/* Column header */}
              <div style={{ padding: '12px 14px 10px', borderBottom: `2px solid ${color}33`, background: `linear-gradient(180deg, ${color}11 0%, transparent 100%)`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{stage}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, background: color + '22', color, borderRadius: 20, padding: '1px 7px', border: `1px solid ${color}44` }}>{stageOutcomes.length}</span>
                </div>
              </div>

              {/* Cards */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stageOutcomes.map(o => (
                  <OutcomeCard
                    key={o.id}
                    outcome={o}
                    onClick={() => setSelectedId(o.id)}
                    onAdvance={() => advanceStage(o.id)}
                  />
                ))}
                {stageOutcomes.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#2a4a5e', fontSize: 12, fontStyle: 'italic' }}>No outcomes yet</div>
                )}
              </div>

              {/* Add button */}
              <div style={{ padding: 10, flexShrink: 0 }}>
                <button
                  onClick={() => setAddingForStage(stage)}
                  style={{ width: '100%', padding: '8px 0', background: 'transparent', color: color + 'aa', border: `1px dashed ${color}44`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.04em' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = color + '11'; (e.currentTarget as HTMLButtonElement).style.borderColor = color + '88'; (e.currentTarget as HTMLButtonElement).style.color = color }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = color + '44'; (e.currentTarget as HTMLButtonElement).style.color = color + 'aa' }}
                >
                  + Add
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail panel */}
      {selectedOutcome && (
        <DetailPanel
          outcome={selectedOutcome}
          onClose={() => setSelectedId(null)}
          onAdvance={() => { advanceStage(selectedOutcome.id) }}
          onRetreat={() => { retreatStage(selectedOutcome.id) }}
        />
      )}

      {/* Backdrop for detail panel */}
      {selectedOutcome && (
        <div onClick={() => setSelectedId(null)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
      )}

      {/* New Outcome Modal */}
      {addingForStage && (
        <NewOutcomeModal
          defaultStage={addingForStage}
          onClose={() => setAddingForStage(null)}
          onSave={addOutcome}
        />
      )}
    </div>
  )
}
