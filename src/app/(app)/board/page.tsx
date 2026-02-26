'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { Pencil, Check, X as XIcon, Trash2, GitPullRequest, GitBranch, GitCommit, Package, FileCode, Plus, ExternalLink } from 'lucide-react'
import type { Outcome, Stage, SignalStatus } from '@/types/floq'
import { STAGES, STAGE_COLORS, SIGNAL_COLORS, NEXT_STAGE } from '@/types/floq'

const RichTextEditor = dynamic(() => import('@/components/editor/RichTextEditor'), { ssr: false, loading: () => <div style={{ height: 80, background: '#040e17', border: '1px solid rgba(45,212,191,0.12)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} /> })

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })

interface Toast { id: string; message: string; type: 'success' | 'error' }

interface CodeLink {
  id: string
  outcomeId: string
  type: 'PR' | 'BRANCH' | 'COMMIT' | 'REPO' | 'SNIPPET'
  url: string
  label?: string | null
  createdAt: string
}

type OutcomeWithExtras = Outcome & {
  description?: string | null
  project?: { id: string; name: string; color: string } | null
  codeLinks?: CodeLink[]
}

const SEED_OUTCOMES: OutcomeWithExtras[] = [
  { id: '1', title: 'Voice scheduling with Retell AI', stage: 'BUILD', signalStatus: 'NORMAL', impactScore: 5, isAiPair: true, workspaceId: 'demo', createdById: 'demo', createdAt: '2025-01-10T00:00:00Z', updatedAt: '2025-02-10T00:00:00Z', stageChangedAt: '2025-02-10T00:00:00Z' },
  { id: '2', title: 'WhatsApp Business API integration', stage: 'SHAPE', signalStatus: 'AT_RISK', impactScore: 4, isAiPair: false, workspaceId: 'demo', createdById: 'demo', createdAt: '2025-01-15T00:00:00Z', updatedAt: '2025-02-05T00:00:00Z', stageChangedAt: '2025-02-05T00:00:00Z' },
  { id: '3', title: 'Mobile app — Android MVP', stage: 'IDENTIFY', signalStatus: 'NORMAL', impactScore: 5, isAiPair: false, workspaceId: 'demo', createdById: 'demo', createdAt: '2025-01-18T00:00:00Z', updatedAt: '2025-01-28T00:00:00Z', stageChangedAt: '2025-01-28T00:00:00Z' },
  { id: '4', title: 'Investor pitch deck v2', stage: 'IDEATE', signalStatus: 'NORMAL', impactScore: 3, isAiPair: true, workspaceId: 'demo', createdById: 'demo', createdAt: '2025-02-12T00:00:00Z', updatedAt: '2025-02-12T00:00:00Z', stageChangedAt: '2025-02-12T00:00:00Z' },
  { id: '5', title: 'Firebase push notifications', stage: 'QA', signalStatus: 'EMERGENCY', impactScore: 4, isAiPair: false, workspaceId: 'demo', createdById: 'demo', createdAt: '2025-01-22T00:00:00Z', updatedAt: '2025-02-08T00:00:00Z', stageChangedAt: '2025-02-08T00:00:00Z' },
  { id: '6', title: 'Customer onboarding flow', stage: 'SHIP', signalStatus: 'NORMAL', impactScore: 4, isAiPair: false, workspaceId: 'demo', createdById: 'demo', createdAt: '2025-01-05T00:00:00Z', updatedAt: '2025-02-15T00:00:00Z', stageChangedAt: '2025-02-15T00:00:00Z' },
]

const SIGNAL_EMOJI: Record<SignalStatus, string> = { NORMAL: '🟢', AT_RISK: '🟡', EMERGENCY: '🔴', DELIVERED: '✅' }

const CODE_LINK_ICONS: Record<CodeLink['type'], React.ReactNode> = {
  PR: <GitPullRequest size={13} />,
  BRANCH: <GitBranch size={13} />,
  COMMIT: <GitCommit size={13} />,
  REPO: <Package size={13} />,
  SNIPPET: <FileCode size={13} />,
}

function ImpactDots({ score, interactive, onChange }: { score: number; interactive?: boolean; onChange?: (n: number) => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          onClick={() => interactive && onChange?.(i)}
          style={{
            width: interactive ? 22 : 8, height: interactive ? 22 : 8,
            borderRadius: interactive ? 6 : '50%',
            background: i <= score ? '#2dd4bf' : 'rgba(45,212,191,0.15)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            cursor: interactive ? 'pointer' : 'default',
            fontSize: 11, fontWeight: 700,
            color: i <= score ? '#040e17' : '#6b8fa8',
            border: interactive ? `1px solid ${i <= score ? '#2dd4bf' : 'rgba(45,212,191,0.2)'}` : 'none',
            transition: 'all 0.1s',
          }}
        >
          {interactive ? i : null}
        </span>
      ))}
    </span>
  )
}

function OutcomeCard({ outcome, onClick, onAdvance, onRedefine }: {
  outcome: OutcomeWithExtras; onClick: () => void; onAdvance: () => void; onRedefine?: () => void
}) {
  const isEmergency = outcome.signalStatus === 'EMERGENCY'
  const isPivot = outcome.stage === 'PIVOT'
  const canAdvance = NEXT_STAGE[outcome.stage] !== undefined

  return (
    <div
      onClick={onClick}
      style={{
        background: '#061c2e',
        border: `1px solid ${isEmergency ? 'rgba(239,68,68,0.5)' : isPivot ? 'rgba(239,68,68,0.3)' : 'rgba(45,212,191,0.1)'}`,
        borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
        transition: 'border-color 0.2s', userSelect: 'none',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = STAGE_COLORS[outcome.stage] + '66' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = isEmergency ? 'rgba(239,68,68,0.5)' : isPivot ? 'rgba(239,68,68,0.3)' : 'rgba(45,212,191,0.1)' }}
    >
      {outcome.project && (
        <div style={{ fontSize: 10, color: outcome.project.color, fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em', opacity: 0.85 }}>
          ▸ {outcome.project.name}
        </div>
      )}
      {isPivot && (
        <div style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, padding: '2px 8px', marginBottom: 8, display: 'inline-block', letterSpacing: '0.08em' }}>
          🔄 PIVOTING
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e8f4f8', lineHeight: 1.3, flex: 1, marginRight: 8 }}>{outcome.title}</span>
        <span title={outcome.signalStatus} style={{ fontSize: 14, flexShrink: 0 }}>{SIGNAL_EMOJI[outcome.signalStatus]}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <ImpactDots score={outcome.impactScore} />
        {outcome.isAiPair && (
          <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 4, padding: '1px 6px', letterSpacing: '0.05em' }}>⚡ AI</span>
        )}
        {outcome.codeLinks && outcome.codeLinks.length > 0 && (
          <span style={{ fontSize: 10, color: '#6b8fa8' }}>🔗 {outcome.codeLinks.length}</span>
        )}
      </div>
      {outcome.stage === 'QA' && outcome.qaAssignee && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: '#06b6d4', fontWeight: 600 }}>🧪 QA:</span>
          {outcome.qaAssignee.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={outcome.qaAssignee.avatarUrl} alt={outcome.qaAssignee.name} style={{ width: 18, height: 18, borderRadius: '50%' }} />
          ) : (
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#06b6d4', fontWeight: 700 }}>
              {outcome.qaAssignee.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ fontSize: 11, color: '#06b6d4' }}>{outcome.qaAssignee.name}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {isPivot ? (
          <button
            onClick={e => { e.stopPropagation(); onRedefine?.() }}
            style={{ fontSize: 12, fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)' }}
          >↩ Redefine → SHAPE</button>
        ) : (
          <>
            <span style={{ fontSize: 10, fontWeight: 700, background: STAGE_COLORS[outcome.stage] + '22', color: STAGE_COLORS[outcome.stage], border: `1px solid ${STAGE_COLORS[outcome.stage]}44`, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {outcome.stage}
            </span>
            {canAdvance && (
              <button
                onClick={e => { e.stopPropagation(); onAdvance() }}
                style={{ fontSize: 14, background: 'rgba(45,212,191,0.1)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,212,191,0.25)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,212,191,0.1)' }}
              >→</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CodeLinksSection({ outcome, workspaceId, onUpdate }: { outcome: OutcomeWithExtras; workspaceId: string | null; onUpdate: (links: CodeLink[]) => void }) {
  const [adding, setAdding] = useState(false)
  const [type, setType] = useState<CodeLink['type']>('PR')
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const links = outcome.codeLinks ?? []

  async function save() {
    if (!url.trim() || !workspaceId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/outcomes/${outcome.id}/code-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, url: url.trim(), label: label.trim() || undefined }),
      })
      if (!res.ok) throw new Error('Failed')
      const link = await res.json()
      onUpdate([...links, link])
      setUrl(''); setLabel(''); setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  async function remove(linkId: string) {
    const res = await fetch(`/api/outcomes/${outcome.id}/code-links?linkId=${linkId}`, { method: 'DELETE' })
    if (res.ok) onUpdate(links.filter(l => l.id !== linkId))
  }

  const inputSt = { background: '#040e17', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 6, padding: '6px 10px', color: '#e8f4f8', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' as const }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Code Links</span>
        {!adding && workspaceId && (
          <button onClick={() => setAdding(true)} style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.3)', color: '#2dd4bf', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={11} /> Add
          </button>
        )}
      </div>
      {adding && (
        <div style={{ background: '#040e17', border: '1px solid rgba(45,212,191,0.15)', borderRadius: 8, padding: '12px', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {(['PR', 'BRANCH', 'COMMIT', 'REPO', 'SNIPPET'] as CodeLink['type'][]).map(t => (
              <button key={t} onClick={() => setType(t)} style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${type === t ? 'rgba(45,212,191,0.5)' : 'rgba(45,212,191,0.15)'}`, background: type === t ? 'rgba(45,212,191,0.15)' : 'transparent', color: type === t ? '#2dd4bf' : '#6b8fa8', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                {t}
              </button>
            ))}
          </div>
          <input style={{ ...inputSt, marginBottom: 6 }} placeholder="https://github.com/..." value={url} onChange={e => setUrl(e.target.value)} />
          <input style={{ ...inputSt, marginBottom: 8 }} placeholder="Label (optional)" value={label} onChange={e => setLabel(e.target.value)} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { setAdding(false); setUrl(''); setLabel('') }} style={{ flex: 1, padding: '6px 0', background: 'transparent', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 6, color: '#6b8fa8', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={!url.trim() || saving} style={{ flex: 2, padding: '6px 0', background: url.trim() ? 'rgba(45,212,191,0.15)' : 'rgba(45,212,191,0.05)', border: `1px solid ${url.trim() ? 'rgba(45,212,191,0.4)' : 'rgba(45,212,191,0.1)'}`, borderRadius: 6, color: url.trim() ? '#2dd4bf' : '#3a5a6e', fontSize: 12, fontWeight: 700, cursor: url.trim() ? 'pointer' : 'not-allowed' }}>
              {saving ? 'Saving…' : 'Add Link'}
            </button>
          </div>
        </div>
      )}
      {links.length === 0 && !adding ? (
        <div style={{ fontSize: 12, color: '#3a5a6e', fontStyle: 'italic' }}>No code links yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {links.map(link => (
            <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#040e17', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 7, padding: '7px 10px' }}>
              <span style={{ color: '#6b8fa8', flexShrink: 0 }}>{CODE_LINK_ICONS[link.type]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {link.label && <div style={{ fontSize: 11, fontWeight: 600, color: '#a8ccd8', marginBottom: 2 }}>{link.label}</div>}
                <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#2dd4bf', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.url}</span>
                  <ExternalLink size={10} style={{ flexShrink: 0 }} />
                </a>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#3a5a6e', textTransform: 'uppercase', flexShrink: 0 }}>{link.type}</span>
              <button onClick={() => remove(link.id)} style={{ background: 'none', border: 'none', color: '#3a5a6e', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3a5a6e' }}>
                <XIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PivotDecisionModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (note: string) => Promise<void> }) {
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  async function confirm() {
    setConfirming(true)
    try { await onConfirm(note) } finally { setConfirming(false) }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,23,0.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#061c2e', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 14, padding: '28px', width: 420, maxWidth: '95vw' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e8f4f8', marginBottom: 10 }}>🔄 Pivot Decision</h3>
        <p style={{ fontSize: 13, color: '#a8ccd8', lineHeight: 1.7, marginBottom: 18 }}>
          This outcome didn&apos;t meet its target.<br />
          Pivot sends it back to <strong style={{ color: '#ec4899' }}>SHAPE</strong> with new learnings to redefine the approach.
        </p>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>Pivot Note (optional)</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What didn't work / new direction..."
          style={{ background: '#040e17', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', color: '#e8f4f8', fontSize: 13, width: '100%', minHeight: 80, resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 20 }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px 0', background: 'transparent', color: '#6b8fa8', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={confirm} disabled={confirming} style={{ flex: 2, padding: '9px 0', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {confirming ? 'Pivoting…' : '🔄 Confirm Pivot'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailPanel({ outcome, workspaceId, onClose, onAdvance, onRetreat, onUpdate, onDelete, onPivotDecision, onRedefine }: {
  outcome: OutcomeWithExtras
  workspaceId: string | null
  onClose: () => void
  onAdvance: () => void
  onRetreat: () => void
  onUpdate: (updated: OutcomeWithExtras) => void
  onDelete: () => void
  onPivotDecision: (note: string) => Promise<void>
  onRedefine: () => void
}) {
  const stageIdx = STAGES.indexOf(outcome.stage)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showPivotModal, setShowPivotModal] = useState(false)

  // Edit state
  const [editTitle, setEditTitle] = useState(outcome.title)
  const [editSignal, setEditSignal] = useState<SignalStatus>(outcome.signalStatus)
  const [editImpact, setEditImpact] = useState(outcome.impactScore)
  const [editAiPair, setEditAiPair] = useState(outcome.isAiPair)
  const [editMetric, setEditMetric] = useState(outcome.targetMetric ?? '')
  const [editDescription, setEditDescription] = useState(outcome.description ?? '')

  function startEdit() {
    setEditTitle(outcome.title)
    setEditSignal(outcome.signalStatus)
    setEditImpact(outcome.impactScore)
    setEditAiPair(outcome.isAiPair)
    setEditMetric(outcome.targetMetric ?? '')
    setEditDescription(outcome.description ?? '')
    setIsEditing(true)
  }

  async function saveEdit() {
    if (!editTitle.trim() || !workspaceId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/outcomes/${outcome.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim(), signalStatus: editSignal, impactScore: editImpact, isAiPair: editAiPair, targetMetric: editMetric.trim() || null, description: editDescription || null }),
      })
      if (!res.ok) throw new Error('Failed')
      const updated = await res.json()
      onUpdate(updated)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/outcomes/${outcome.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      onDelete()
    } finally {
      setDeleting(false)
    }
  }

  const inputSt: React.CSSProperties = { background: '#040e17', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 8, padding: '8px 12px', color: '#e8f4f8', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const labelSt: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }

  const isPivot = outcome.stage === 'PIVOT'
  const isMeasure = outcome.stage === 'MEASURE'

  return (
    <>
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, background: '#061c2e', borderLeft: '1px solid rgba(45,212,191,0.2)', zIndex: 300, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(45,212,191,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div style={{ flex: 1, marginRight: 12 }}>
            {outcome.project && (
              <div style={{ fontSize: 10, color: outcome.project.color, fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>▸ {outcome.project.name}</div>
            )}
            <div style={{ fontSize: 11, fontWeight: 700, color: STAGE_COLORS[outcome.stage], textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{outcome.stage}</div>
            {isEditing ? (
              <input style={inputSt} value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus />
            ) : (
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#e8f4f8', lineHeight: 1.3 }}>{outcome.title}</h2>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            {isEditing ? (
              <>
                <button onClick={saveEdit} disabled={saving} title="Save" style={{ background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.4)', borderRadius: 7, color: '#2dd4bf', padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={13} /> {saving ? '…' : 'Save'}
                </button>
                <button onClick={() => setIsEditing(false)} title="Cancel" style={{ background: 'none', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 7, color: '#6b8fa8', padding: '5px 8px', cursor: 'pointer' }}>
                  <XIcon size={13} />
                </button>
              </>
            ) : (
              <>
                {workspaceId && <button onClick={startEdit} title="Edit" style={{ background: 'none', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 7, color: '#6b8fa8', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#2dd4bf' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b8fa8' }}>
                  <Pencil size={13} />
                </button>}
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a8ccd8', fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Signal Status */}
          <div style={{ marginBottom: 20 }}>
            <span style={labelSt}>Signal Status</span>
            {isEditing ? (
              <div style={{ display: 'flex', gap: 6 }}>
                {(['NORMAL', 'AT_RISK', 'EMERGENCY'] as SignalStatus[]).map(s => (
                  <button key={s} onClick={() => setEditSignal(s)} style={{ flex: 1, padding: '7px 4px', borderRadius: 7, border: `1px solid ${editSignal === s ? SIGNAL_COLORS[s] : 'rgba(45,212,191,0.15)'}`, background: editSignal === s ? SIGNAL_COLORS[s] + '22' : 'transparent', color: editSignal === s ? SIGNAL_COLORS[s] : '#6b8fa8', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    {s === 'NORMAL' ? '🟢' : s === 'AT_RISK' ? '🟡' : '🔴'} {s}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: SIGNAL_COLORS[outcome.signalStatus], display: 'inline-block' }} />
                <span style={{ fontWeight: 600, color: SIGNAL_COLORS[outcome.signalStatus] }}>{outcome.signalStatus}</span>
              </div>
            )}
          </div>

          {/* Impact Score */}
          <div style={{ marginBottom: 20 }}>
            <span style={labelSt}>Impact Score</span>
            {isEditing ? (
              <ImpactDots score={editImpact} interactive onChange={setEditImpact} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ImpactDots score={outcome.impactScore} />
                <span style={{ fontSize: 13, color: '#a8ccd8' }}>{outcome.impactScore} / 5</span>
              </div>
            )}
          </div>

          {/* AI Pair */}
          <div style={{ marginBottom: 20 }}>
            <span style={labelSt}>AI Pair</span>
            {isEditing ? (
              <button onClick={() => setEditAiPair(p => !p)} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${editAiPair ? 'rgba(99,102,241,0.5)' : 'rgba(45,212,191,0.15)'}`, background: editAiPair ? 'rgba(99,102,241,0.2)' : 'transparent', color: editAiPair ? '#818cf8' : '#6b8fa8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {editAiPair ? '⚡ Enabled' : 'Disabled — click to enable'}
              </button>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 700, background: outcome.isAiPair ? 'rgba(99,102,241,0.2)' : 'rgba(100,100,100,0.15)', color: outcome.isAiPair ? '#818cf8' : '#6b8fa8', border: `1px solid ${outcome.isAiPair ? 'rgba(99,102,241,0.4)' : 'rgba(100,100,100,0.3)'}`, borderRadius: 5, padding: '3px 10px' }}>
                {outcome.isAiPair ? '⚡ Active' : 'Disabled'}
              </span>
            )}
          </div>

          {/* Target Metric */}
          <div style={{ marginBottom: 20 }}>
            <span style={labelSt}>Target Metric</span>
            {isEditing ? (
              <textarea style={{ ...inputSt, minHeight: 80, resize: 'vertical' }} value={editMetric} onChange={e => setEditMetric(e.target.value)} placeholder="e.g. 1000 active users / month" />
            ) : outcome.targetMetric ? (
              <p style={{ fontSize: 13, color: '#a8ccd8', lineHeight: 1.5 }}>{outcome.targetMetric}</p>
            ) : (
              <span style={{ fontSize: 12, color: '#3a5a6e', fontStyle: 'italic' }}>Not set</span>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <span style={labelSt}>Description</span>
            {isEditing ? (
              <RichTextEditor content={editDescription} onChange={setEditDescription} editable minHeight={80} placeholder="Add a description…" />
            ) : outcome.description ? (
              <div className="tiptap-editor" style={{ fontSize: 13, color: '#a8ccd8', lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: outcome.description }} />
            ) : (
              <span style={{ fontSize: 12, color: '#3a5a6e', fontStyle: 'italic' }}>No description</span>
            )}
          </div>

          {/* Assignee */}
          {outcome.assignee && (
            <div style={{ marginBottom: 20 }}>
              <span style={labelSt}>Assignee</span>
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

          {/* QA Assignee */}
          <div style={{ marginBottom: 20 }}>
            <span style={labelSt}>QA Assignee</span>
            {outcome.qaAssignee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {outcome.qaAssignee.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={outcome.qaAssignee.avatarUrl} alt={outcome.qaAssignee.name} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(6,182,212,0.4)' }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#06b6d4', fontWeight: 700 }}>
                    {outcome.qaAssignee.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: 13, color: '#a8ccd8' }}>{outcome.qaAssignee.name}</span>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: '#3a5a6e', fontStyle: 'italic' }}>— Unassigned</span>
            )}
          </div>

          {/* Counts */}
          {outcome._count && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#6b8fa8' }}><span style={{ fontWeight: 700, color: '#a8ccd8' }}>{outcome._count.signals}</span> signals</div>
              <div style={{ fontSize: 12, color: '#6b8fa8' }}><span style={{ fontWeight: 700, color: '#a8ccd8' }}>{outcome._count.comments}</span> comments</div>
            </div>
          )}

          {/* Stage timeline */}
          <div style={{ marginBottom: 0 }}>
            <span style={labelSt}>Stage Timeline</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STAGES.slice(0, STAGES.indexOf(outcome.stage) + 1).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s === outcome.stage ? STAGE_COLORS[s] : STAGE_COLORS[s] + '66', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: s === outcome.stage ? STAGE_COLORS[s] : STAGE_COLORS[s] + 'aa', width: 80 }}>{s}</span>
                  {s === outcome.stage && outcome.stageChangedAt && (
                    <span style={{ fontSize: 11, color: '#6b8fa8' }}>{new Date(outcome.stageChangedAt).toLocaleDateString()}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Code Links */}
          <CodeLinksSection outcome={outcome} workspaceId={workspaceId} onUpdate={links => onUpdate({ ...outcome, codeLinks: links })} />

          {/* Delete zone */}
          {workspaceId && !isEditing && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(239,68,68,0.15)' }}>
              {confirmDelete ? (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 14px' }}>
                  <p style={{ fontSize: 13, color: '#f87171', marginBottom: 10 }}>Delete this outcome? This cannot be undone.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '7px 0', background: 'transparent', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 7, color: '#6b8fa8', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleDelete} disabled={deleting} style={{ flex: 2, padding: '7px 0', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 7, color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {deleting ? 'Deleting…' : 'Yes, Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, color: '#6b8fa8', padding: '7px 12px', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#ef4444'; b.style.borderColor = 'rgba(239,68,68,0.4)' }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#6b8fa8'; b.style.borderColor = 'rgba(239,68,68,0.2)' }}>
                  <Trash2 size={13} /> Delete Outcome
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {isPivot ? (
          <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(239,68,68,0.2)', flexShrink: 0 }}>
            <button onClick={onRedefine} style={{ width: '100%', padding: '10px 0', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              ↩ Redefine → SHAPE
            </button>
          </div>
        ) : isMeasure ? (
          <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(45,212,191,0.15)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={onRetreat} style={{ flex: 1, padding: '9px 0', background: 'rgba(107,143,168,0.1)', color: '#a8ccd8', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>← Retreat</button>
            <button onClick={onAdvance} style={{ flex: 1, padding: '9px 0', background: 'rgba(45,212,191,0.15)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.35)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>✅ Deliver</button>
            <button onClick={() => setShowPivotModal(true)} style={{ flex: 1, padding: '9px 0', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🔄 Pivot</button>
          </div>
        ) : (
          <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(45,212,191,0.15)', display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={onRetreat} disabled={stageIdx === 0} style={{ flex: 1, padding: '9px 0', background: 'rgba(107,143,168,0.1)', color: stageIdx === 0 ? '#3a5a6e' : '#a8ccd8', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8, cursor: stageIdx === 0 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>← Retreat</button>
            <button onClick={onAdvance} disabled={NEXT_STAGE[outcome.stage] === undefined} style={{ flex: 1, padding: '9px 0', background: NEXT_STAGE[outcome.stage] === undefined ? 'rgba(45,212,191,0.05)' : 'rgba(45,212,191,0.15)', color: NEXT_STAGE[outcome.stage] === undefined ? '#3a5a6e' : '#2dd4bf', border: `1px solid ${NEXT_STAGE[outcome.stage] === undefined ? 'rgba(45,212,191,0.1)' : 'rgba(45,212,191,0.35)'}`, borderRadius: 8, cursor: NEXT_STAGE[outcome.stage] === undefined ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>Advance →</button>
          </div>
        )}
      </div>

      {showPivotModal && (
        <PivotDecisionModal
          onClose={() => setShowPivotModal(false)}
          onConfirm={async (note) => {
            await onPivotDecision(note)
            setShowPivotModal(false)
          }}
        />
      )}
    </>
  )
}

function NewOutcomeModal({ defaultStage, workspaceId, onClose, onSave }: {
  defaultStage: Stage; workspaceId: string | null
  onClose: () => void
  onSave: (title: string, stage: Stage, impactScore: number, isAiPair: boolean, signalStatus: SignalStatus, description?: string) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stage, setStage] = useState<Stage>(defaultStage)
  const [impactScore, setImpactScore] = useState(3)
  const [isAiPair, setIsAiPair] = useState(false)
  const [signalStatus, setSignalStatus] = useState<SignalStatus>('NORMAL')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim() || saving) return
    setSaving(true)
    try { await onSave(title.trim(), stage, impactScore, isAiPair, signalStatus, description || undefined) } finally { setSaving(false) }
  }

  const inputStyle: React.CSSProperties = { width: '100%', background: '#0a1e2e', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8, padding: '9px 12px', color: '#e8f4f8', fontSize: 14, outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,23,0.85)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 14, padding: '28px 28px 24px', width: 420, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e8f4f8' }}>New Outcome</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b8fa8', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="What outcome are you driving?" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSave() }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Description <span style={{ color: '#3a5a6e', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
          <RichTextEditor content={description} onChange={setDescription} editable minHeight={80} placeholder="Add a description…" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Stage</label>
          <select style={inputStyle} value={stage} onChange={e => setStage(e.target.value as Stage)}>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Signal Status</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['NORMAL', 'AT_RISK', 'EMERGENCY'] as SignalStatus[]).map(s => (
              <button key={s} onClick={() => setSignalStatus(s)} style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${signalStatus === s ? SIGNAL_COLORS[s] : 'rgba(45,212,191,0.15)'}`, background: signalStatus === s ? SIGNAL_COLORS[s] + '22' : 'transparent', color: signalStatus === s ? SIGNAL_COLORS[s] : '#6b8fa8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {SIGNAL_EMOJI[s]} {s}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Impact Score</label>
          <ImpactDots score={impactScore} interactive onChange={setImpactScore} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>AI Pair</label>
          <button onClick={() => setIsAiPair(!isAiPair)} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${isAiPair ? 'rgba(99,102,241,0.5)' : 'rgba(45,212,191,0.15)'}`, background: isAiPair ? 'rgba(99,102,241,0.2)' : 'transparent', color: isAiPair ? '#818cf8' : '#6b8fa8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {isAiPair ? '⚡ Enabled' : 'Disabled — click to enable'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', background: 'transparent', color: '#6b8fa8', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={!title.trim() || saving} style={{ flex: 2, padding: '10px 0', background: title.trim() && !saving ? 'rgba(45,212,191,0.15)' : 'rgba(45,212,191,0.05)', color: title.trim() && !saving ? '#2dd4bf' : '#3a5a6e', border: `1px solid ${title.trim() && !saving ? 'rgba(45,212,191,0.4)' : 'rgba(45,212,191,0.1)'}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: title.trim() && !saving ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Creating…' : 'Create Outcome'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div style={{ flex: 1, display: 'flex', gap: 12, padding: 16, overflowX: 'auto', overflowY: 'hidden' }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} style={{ minWidth: 220, flex: '0 0 240px', background: '#061420', borderRadius: 12, border: '1px solid rgba(45,212,191,0.08)', padding: '12px 10px' }}>
          <div style={{ height: 18, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 12, animation: 'pulse 1.5s infinite' }} />
          {[1, 2].map(j => <div key={j} style={{ height: 76, background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 8, animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}

export default function BoardPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [initDone, setInitDone] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addingForStage, setAddingForStage] = useState<Stage | null>(null)

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  useEffect(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('floq_workspaceId') : null
    if (cached) { setWorkspaceId(cached); setInitDone(true); return }
    fetch('/api/workspace/init').then(r => r.json()).then(data => {
      if (data.workspaceId) { localStorage.setItem('floq_workspaceId', data.workspaceId); setWorkspaceId(data.workspaceId) }
      else setInitError(data.error ?? 'Failed to init workspace')
    }).catch(() => setInitError('Failed to connect')).finally(() => setInitDone(true))
  }, [])

  const { data: outcomes, mutate, isLoading } = useSWR<OutcomeWithExtras[]>(
    workspaceId ? `/api/outcomes?workspaceId=${workspaceId}` : null,
    fetcher,
    { refreshInterval: 30000 },
  )

  const displayOutcomes: OutcomeWithExtras[] = outcomes ?? SEED_OUTCOMES
  const isDemo = !workspaceId || (!outcomes && isLoading)
  const selectedOutcome = displayOutcomes.find(o => o.id === selectedId) ?? null

  const advanceStage = async (outcome: OutcomeWithExtras) => {
    const nextStage = NEXT_STAGE[outcome.stage]
    if (!nextStage || !workspaceId) return
    mutate(displayOutcomes.map(o => o.id === outcome.id ? { ...o, stage: nextStage } : o), false)
    try {
      const res = await fetch(`/api/outcomes/${outcome.id}/stage`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: nextStage }) })
      if (!res.ok) throw new Error()
      addToast(`"${outcome.title.slice(0, 30)}" → ${nextStage}`)
      mutate()
    } catch { mutate(); addToast('Failed to move outcome', 'error') }
  }

  const retreatStage = async (outcome: OutcomeWithExtras) => {
    const idx = STAGES.indexOf(outcome.stage)
    if (idx <= 0 || !workspaceId) return
    const prevStage = STAGES[idx - 1]
    mutate(displayOutcomes.map(o => o.id === outcome.id ? { ...o, stage: prevStage } : o), false)
    try {
      const res = await fetch(`/api/outcomes/${outcome.id}/stage`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: prevStage }) })
      if (!res.ok) throw new Error()
      addToast(`"${outcome.title.slice(0, 30)}" ← ${prevStage}`)
      mutate()
    } catch { mutate(); addToast('Failed to move outcome', 'error') }
  }

  const pivotDecision = async (outcome: OutcomeWithExtras, note: string) => {
    if (!workspaceId) return
    mutate(displayOutcomes.map(o => o.id === outcome.id ? { ...o, stage: 'PIVOT' as Stage } : o), false)
    try {
      const res = await fetch(`/api/outcomes/${outcome.id}/stage`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'PIVOT', note: note || undefined }) })
      if (!res.ok) throw new Error()
      addToast(`"${outcome.title.slice(0, 30)}" → PIVOT 🔄`)
      mutate()
    } catch { mutate(); addToast('Failed to pivot outcome', 'error') }
  }

  const redefineFromPivot = async (outcome: OutcomeWithExtras) => {
    if (!workspaceId) return
    mutate(displayOutcomes.map(o => o.id === outcome.id ? { ...o, stage: 'SHAPE' as Stage } : o), false)
    try {
      const res = await fetch(`/api/outcomes/${outcome.id}/stage`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'SHAPE', note: 'Redefined after pivot' }) })
      if (!res.ok) throw new Error()
      addToast(`"${outcome.title.slice(0, 30)}" ↩ Redefined → SHAPE`)
      mutate()
    } catch { mutate(); addToast('Failed to redefine outcome', 'error') }
  }

  const addOutcome = async (title: string, stage: Stage, impactScore: number, isAiPair: boolean, signalStatus: SignalStatus, description?: string) => {
    if (!workspaceId) return
    const res = await fetch('/api/outcomes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, stage, impactScore, isAiPair, signalStatus, workspaceId, description }) })
    if (!res.ok) { addToast('Failed to create outcome', 'error'); throw new Error() }
    const created = await res.json()
    mutate([...(outcomes ?? []), created], false)
    addToast(`"${title.slice(0, 30)}" added to ${stage}`)
    setAddingForStage(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#040e17', overflow: 'hidden' }}>
      {/* Page header */}
      <div style={{ height: 52, background: '#061c2e', borderBottom: '1px solid rgba(45,212,191,0.12)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#a8ccd8' }}>Outcome Flow Board</span>
        {isDemo && <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(45,212,191,0.1)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 20, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>DEMO</span>}
        {initError && <span style={{ fontSize: 12, color: '#ef4444' }}>⚠ {initError}</span>}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#3a5a6e' }}>{displayOutcomes.length} outcomes across {STAGES.length} stages</span>
      </div>

      {!initDone ? <BoardSkeleton /> : (
        <div style={{ flex: 1, display: 'flex', overflowX: 'auto', overflowY: 'hidden', padding: '12px 12px', gap: 10 }}>
          {STAGES.map(stage => {
            const stageOutcomes = displayOutcomes.filter(o => o.stage === stage)
            const color = STAGE_COLORS[stage]
            const isQA = stage === 'QA'
            const isPivotCol = stage === 'PIVOT'
            return (
              <div key={stage} style={{ minWidth: 220, maxWidth: 260, flex: '0 0 240px', display: 'flex', flexDirection: 'column', background: '#061420', borderRadius: 12, border: `1px solid ${isPivotCol ? 'rgba(239,68,68,0.12)' : 'rgba(45,212,191,0.08)'}`, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px 10px', borderBottom: `2px solid ${color}33`, background: `linear-gradient(180deg,${color}11 0%,transparent 100%)`, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                      {isQA ? '🧪 ' : ''}{stage}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: color + '22', color, borderRadius: 20, padding: '1px 7px', border: `1px solid ${color}44` }}>{stageOutcomes.length}</span>
                  </div>
                  {isQA && <div style={{ fontSize: 10, color: '#06b6d4', opacity: 0.75, marginTop: 4, letterSpacing: '0.02em' }}>Quality gate before shipping</div>}
                  {isPivotCol && <div style={{ fontSize: 10, color: '#ef444488', marginTop: 4, letterSpacing: '0.02em', lineHeight: 1.4 }}>Outcomes that didn&apos;t deliver. Redefine and send back to SHAPE.</div>}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stageOutcomes.map(o => (
                    <OutcomeCard
                      key={o.id}
                      outcome={o}
                      onClick={() => setSelectedId(o.id)}
                      onAdvance={() => advanceStage(o)}
                      onRedefine={isPivotCol ? () => redefineFromPivot(o) : undefined}
                    />
                  ))}
                  {stageOutcomes.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0', color: '#2a4a5e', fontSize: 12, fontStyle: 'italic' }}>{isPivotCol ? 'No pivots yet' : 'No outcomes yet'}</div>}
                </div>
                {!isPivotCol && (
                  <div style={{ padding: 10, flexShrink: 0 }}>
                    <button onClick={() => setAddingForStage(stage)} style={{ width: '100%', padding: '8px 0', background: 'transparent', color: color + 'aa', border: `1px dashed ${color}44`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = color + '11'; b.style.borderColor = color + '88'; b.style.color = color }}
                      onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'transparent'; b.style.borderColor = color + '44'; b.style.color = color + 'aa' }}>
                      + Add
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selectedOutcome && (
        <>
          <div onClick={() => setSelectedId(null)} style={{ position: 'fixed', inset: 0, zIndex: 299 }} />
          <DetailPanel
            outcome={selectedOutcome}
            workspaceId={workspaceId}
            onClose={() => setSelectedId(null)}
            onAdvance={() => advanceStage(selectedOutcome)}
            onRetreat={() => retreatStage(selectedOutcome)}
            onPivotDecision={(note) => pivotDecision(selectedOutcome, note)}
            onRedefine={() => { redefineFromPivot(selectedOutcome); setSelectedId(null) }}
            onUpdate={updated => {
              mutate(displayOutcomes.map(o => o.id === updated.id ? updated : o), false)
              addToast('Outcome updated')
            }}
            onDelete={() => {
              mutate(displayOutcomes.filter(o => o.id !== selectedOutcome.id), false)
              setSelectedId(null)
              addToast('Outcome deleted')
            }}
          />
        </>
      )}

      {addingForStage && (
        <NewOutcomeModal defaultStage={addingForStage} workspaceId={workspaceId} onClose={() => setAddingForStage(null)} onSave={addOutcome} />
      )}

      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding: '10px 16px', borderRadius: 8, background: t.type === 'success' ? '#061c2e' : '#1a0a0a', border: `1px solid ${t.type === 'success' ? 'rgba(45,212,191,0.4)' : 'rgba(239,68,68,0.4)'}`, color: t.type === 'success' ? '#2dd4bf' : '#ef4444', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', animation: 'slideIn 0.2s ease', maxWidth: 320 }}>
            {t.type === 'success' ? '✓ ' : '✕ '}{t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
