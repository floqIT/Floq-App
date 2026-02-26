'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { Pencil, Check, X as XIcon, Trash2, ChevronRight, ChevronDown, Plus } from 'lucide-react'
import type { Outcome, Stage, SignalStatus } from '@/types/floq'
import { STAGES, STAGE_COLORS, SIGNAL_COLORS } from '@/types/floq'

const RichTextEditor = dynamic(() => import('@/components/editor/RichTextEditor'), {
  ssr: false,
  loading: () => <div style={{ height: 80, background: '#040e17', border: '1px solid rgba(45,212,191,0.12)', borderRadius: 8 }} />,
})

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json() })

type OutcomeRow = Outcome & {
  project?: { id: string; name: string; color: string } | null
  description?: string | null
}

interface EditState {
  title: string
  signalStatus: SignalStatus
  stage: Stage
  impactScore: number
  isAiPair: boolean
  description: string
  assigneeId: string | null
}

interface WSMember {
  id: string; name: string; email: string; avatarUrl?: string | null
}

interface Toast { id: string; message: string; type: 'success' | 'error' }

const SIGNAL_EMOJI: Record<SignalStatus, string> = { NORMAL: '🟢', AT_RISK: '🟡', EMERGENCY: '🔴', DELIVERED: '✅' }
const GRID = '28px 1fr 104px 76px 60px 48px 78px 120px'

function timeAgo(date: string) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function ImpactDots({ score, interactive, onChange }: { score: number; interactive?: boolean; onChange?: (n: number) => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: interactive ? 5 : 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          onClick={() => interactive && onChange?.(i)}
          style={{
            width: interactive ? 20 : 6, height: interactive ? 20 : 6,
            borderRadius: interactive ? 5 : '50%',
            background: i <= score ? '#2dd4bf' : 'rgba(45,212,191,0.15)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            cursor: interactive ? 'pointer' : 'default',
            fontSize: 10, fontWeight: 700,
            color: i <= score ? '#040e17' : '#6b8fa8',
            border: interactive ? `1px solid ${i <= score ? '#2dd4bf' : 'rgba(45,212,191,0.2)'}` : 'none',
          }}
        >{interactive ? i : null}</span>
      ))}
    </span>
  )
}

// ─── New Outcome Modal ────────────────────────────────────────────────────────
function NewOutcomeModal({ workspaceId, projectId, onClose, onCreated }: {
  workspaceId: string
  projectId?: string
  onClose: () => void
  onCreated: (o: OutcomeRow) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stage, setStage] = useState<Stage>('IDEATE')
  const [signalStatus, setSignalStatus] = useState<SignalStatus>('NORMAL')
  const [impactScore, setImpactScore] = useState(3)
  const [isAiPair, setIsAiPair] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), workspaceId, stage, signalStatus, impactScore, isAiPair, description: description || undefined, ...(projectId ? { projectId } : {}) }),
      })
      if (!res.ok) throw new Error('Failed')
      const created = await res.json()
      onCreated(created)
    } finally { setSaving(false) }
  }

  const inp: React.CSSProperties = { background: '#0a1e2e', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8, padding: '9px 12px', color: '#e8f4f8', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, display: 'block' }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,23,0.88)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 14, padding: '28px', width: 460, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e8f4f8' }}>
            New Outcome {projectId && <span style={{ fontSize: 12, color: '#6b8fa8', fontWeight: 400 }}>(project-scoped)</span>}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b8fa8', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Title</label>
          <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="What outcome are you driving?" autoFocus onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSave() }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Stage</label>
          <select style={{ ...inp, padding: '8px 12px' }} value={stage} onChange={e => setStage(e.target.value as Stage)}>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Signal Status</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['NORMAL', 'AT_RISK', 'EMERGENCY'] as SignalStatus[]).map(s => (
              <button key={s} onClick={() => setSignalStatus(s)} style={{ flex: 1, padding: '7px 6px', borderRadius: 8, border: `1px solid ${signalStatus === s ? SIGNAL_COLORS[s] : 'rgba(45,212,191,0.15)'}`, background: signalStatus === s ? SIGNAL_COLORS[s] + '22' : 'transparent', color: signalStatus === s ? SIGNAL_COLORS[s] : '#6b8fa8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {SIGNAL_EMOJI[s]} {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Impact Score</label>
          <ImpactDots score={impactScore} interactive onChange={setImpactScore} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>AI Pair</label>
          <button onClick={() => setIsAiPair(p => !p)} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${isAiPair ? 'rgba(99,102,241,0.5)' : 'rgba(45,212,191,0.15)'}`, background: isAiPair ? 'rgba(99,102,241,0.2)' : 'transparent', color: isAiPair ? '#818cf8' : '#6b8fa8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {isAiPair ? '⚡ Enabled' : 'Disabled — click to enable'}
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={lbl}>Description <span style={{ color: '#3a5a6e', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></label>
          <RichTextEditor content={description} onChange={setDescription} editable minHeight={80} placeholder="Add context…" />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', background: 'transparent', color: '#6b8fa8', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={!title.trim() || saving} style={{ flex: 2, padding: '10px 0', background: title.trim() ? 'rgba(45,212,191,0.15)' : 'rgba(45,212,191,0.05)', color: title.trim() ? '#2dd4bf' : '#3a5a6e', border: `1px solid ${title.trim() ? 'rgba(45,212,191,0.4)' : 'rgba(45,212,191,0.1)'}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: title.trim() ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Creating…' : 'Create Outcome'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Inline Edit Card ─────────────────────────────────────────────────────────
function EditCard({ outcome, members, onSave, onCancel }: {
  outcome: OutcomeRow
  members: WSMember[]
  onSave: (updated: OutcomeRow) => void
  onCancel: () => void
}) {
  const [state, setState] = useState<EditState>({
    title: outcome.title,
    signalStatus: outcome.signalStatus,
    stage: outcome.stage,
    impactScore: outcome.impactScore,
    isAiPair: outcome.isAiPair,
    description: outcome.description ?? '',
    assigneeId: outcome.assigneeId ?? null,
  })
  const [showDesc, setShowDesc] = useState(!!outcome.description)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof EditState>(k: K, v: EditState[K]) {
    setState(s => ({ ...s, [k]: v }))
  }

  async function handleSave() {
    if (!state.title.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/outcomes/${outcome.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: state.title.trim(),
          signalStatus: state.signalStatus,
          stage: state.stage,
          impactScore: state.impactScore,
          isAiPair: state.isAiPair,
          description: state.description.trim() || null,
          assigneeId: state.assigneeId,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const updated = await res.json()
      onSave(updated)
    } catch {
      setSaving(false)
    }
  }

  const inp: React.CSSProperties = { background: '#040e17', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 7, padding: '7px 10px', color: '#e8f4f8', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, display: 'block' }

  return (
    <div style={{ background: 'rgba(45,212,191,0.04)', border: '1px solid rgba(45,212,191,0.22)', borderRadius: 10, padding: '16px 18px', margin: '0 0 1px' }}>
      {/* Row 1: Title full-width */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Title</label>
        <input
          style={{ ...inp, width: '100%', fontSize: 14, fontWeight: 600 }}
          value={state.title}
          onChange={e => set('title', e.target.value)}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel() }}
        />
      </div>

      {/* Row 2: Fields grid */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14, alignItems: 'flex-start' }}>
        {/* Stage */}
        <div style={{ minWidth: 120 }}>
          <label style={lbl}>Stage</label>
          <select
            style={{ ...inp, minWidth: 110 }}
            value={state.stage}
            onChange={e => set('stage', e.target.value as Stage)}
          >
            {STAGES.map(s => <option key={s} value={s} style={{ color: STAGE_COLORS[s] }}>{s}</option>)}
          </select>
        </div>

        {/* Signal */}
        <div>
          <label style={lbl}>Signal</label>
          <div style={{ display: 'flex', gap: 5 }}>
            {(['NORMAL', 'AT_RISK', 'EMERGENCY'] as SignalStatus[]).map(s => (
              <button
                key={s}
                onClick={() => set('signalStatus', s)}
                style={{ padding: '5px 9px', borderRadius: 7, border: `1px solid ${state.signalStatus === s ? SIGNAL_COLORS[s] : 'rgba(45,212,191,0.15)'}`, background: state.signalStatus === s ? SIGNAL_COLORS[s] + '22' : 'transparent', color: state.signalStatus === s ? SIGNAL_COLORS[s] : '#6b8fa8', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {SIGNAL_EMOJI[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Impact */}
        <div>
          <label style={lbl}>Impact</label>
          <ImpactDots score={state.impactScore} interactive onChange={v => set('impactScore', v)} />
        </div>

        {/* AI Pair */}
        <div>
          <label style={lbl}>AI Pair</label>
          <button
            onClick={() => set('isAiPair', !state.isAiPair)}
            style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${state.isAiPair ? 'rgba(99,102,241,0.5)' : 'rgba(45,212,191,0.15)'}`, background: state.isAiPair ? 'rgba(99,102,241,0.2)' : 'transparent', color: state.isAiPair ? '#818cf8' : '#6b8fa8', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            {state.isAiPair ? '⚡ ON' : '— OFF'}
          </button>
        </div>

        {/* Assignee */}
        {members.length > 0 && (
          <div>
            <label style={lbl}>Assignee</label>
            <select
              style={{ ...inp, minWidth: 140 }}
              value={state.assigneeId ?? ''}
              onChange={e => set('assigneeId', e.target.value || null)}
            >
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Description toggle */}
      <div style={{ marginBottom: 14 }}>
        <button
          onClick={() => setShowDesc(d => !d)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#6b8fa8', fontSize: 12, cursor: 'pointer', padding: 0 }}
        >
          {showDesc ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          Description
        </button>
        {showDesc && (
          <div style={{ marginTop: 8 }}>
            <RichTextEditor content={state.description} onChange={v => set('description', v)} editable minHeight={80} placeholder="Add context…" />
          </div>
        )}
      </div>

      {/* Save / Cancel */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: 'transparent', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 7, color: '#6b8fa8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <XIcon size={13} /> Cancel
        </button>
        <button onClick={handleSave} disabled={!state.title.trim() || saving} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 16px', background: state.title.trim() ? 'rgba(45,212,191,0.15)' : 'rgba(45,212,191,0.05)', border: `1px solid ${state.title.trim() ? 'rgba(45,212,191,0.4)' : 'rgba(45,212,191,0.1)'}`, borderRadius: 7, color: state.title.trim() ? '#2dd4bf' : '#3a5a6e', fontSize: 13, fontWeight: 700, cursor: state.title.trim() ? 'pointer' : 'not-allowed' }}>
          <Check size={13} /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OutcomesPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<Stage | 'ALL'>('ALL')
  const [signalFilter, setSignalFilter] = useState<SignalStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStage, setBulkStage] = useState<Stage>('IDEATE')
  const [showNewModal, setShowNewModal] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  useEffect(() => {
    const cached = localStorage.getItem('floq_workspaceId')
    if (cached) { setWorkspaceId(cached); return }
    fetch('/api/workspace/init').then(r => r.json()).then(d => { if (d.workspaceId) { localStorage.setItem('floq_workspaceId', d.workspaceId); setWorkspaceId(d.workspaceId) } })
  }, [])

  const { data: outcomes = [], mutate, isLoading } = useSWR<OutcomeRow[]>(
    workspaceId ? `/api/outcomes?workspaceId=${workspaceId}` : null, fetcher
  )

  const { data: members = [] } = useSWR<WSMember[]>(
    workspaceId ? `/api/members?workspaceId=${workspaceId}` : null, fetcher
  )

  const filtered = outcomes.filter(o => {
    if (stageFilter !== 'ALL' && o.stage !== stageFilter) return false
    if (signalFilter !== 'ALL' && o.signalStatus !== signalFilter) return false
    if (search && !o.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function toggleExpand(id: string) {
    setExpandedIds(s => { const n = new Set(s); if (n.has(id)) { n.delete(id) } else { n.add(id) }; return n })
  }

  function toggleSelect(id: string) {
    setSelected(s => { const n = new Set(s); if (n.has(id)) { n.delete(id) } else { n.add(id) }; return n })
  }

  function selectAll() {
    setSelected(filtered.every(o => selected.has(o.id)) ? new Set() : new Set(filtered.map(o => o.id)))
  }

  async function advanceStage(o: OutcomeRow) {
    const idx = STAGES.indexOf(o.stage)
    if (idx >= STAGES.length - 1) return
    const stage = STAGES[idx + 1]
    mutate(outcomes.map(x => x.id === o.id ? { ...x, stage } : x), false)
    await fetch(`/api/outcomes/${o.id}/stage`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }) })
    mutate()
  }

  async function retreatStage(o: OutcomeRow) {
    const idx = STAGES.indexOf(o.stage)
    if (idx <= 0) return
    const stage = STAGES[idx - 1]
    mutate(outcomes.map(x => x.id === o.id ? { ...x, stage } : x), false)
    await fetch(`/api/outcomes/${o.id}/stage`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }) })
    mutate()
  }

  async function deleteOutcome(id: string) {
    const o = outcomes.find(x => x.id === id)
    mutate(outcomes.filter(x => x.id !== id), false)
    setConfirmDeleteId(null)
    setEditingId(null)
    const res = await fetch(`/api/outcomes/${id}`, { method: 'DELETE' })
    if (!res.ok) { mutate(); addToast('Failed to delete', 'error'); return }
    addToast(`"${(o?.title ?? '').slice(0, 32)}" deleted`)
    setSelected(s => { const n = new Set(s); n.delete(id); return n })
  }

  async function bulkMoveStage() {
    const ids = [...selected]
    mutate(outcomes.map(o => selected.has(o.id) ? { ...o, stage: bulkStage } : o), false)
    await Promise.all(ids.map(id => fetch(`/api/outcomes/${id}/stage`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: bulkStage }) })))
    mutate()
    setSelected(new Set())
    addToast(`${ids.length} outcomes moved to ${bulkStage}`)
  }

  async function bulkDelete() {
    const ids = [...selected]
    mutate(outcomes.filter(o => !selected.has(o.id)), false)
    await Promise.all(ids.map(id => fetch(`/api/outcomes/${id}`, { method: 'DELETE' })))
    mutate()
    setSelected(new Set())
    addToast(`${ids.length} outcomes deleted`)
  }

  const pillBtn = (active: boolean, color?: string): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 20, border: `1px solid ${active ? (color ?? '#2dd4bf') : 'rgba(45,212,191,0.15)'}`,
    background: active ? (color ?? '#2dd4bf') + '22' : 'transparent', color: active ? (color ?? '#2dd4bf') : '#6b8fa8',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
  })

  const allFilteredSelected = filtered.length > 0 && filtered.every(o => selected.has(o.id))

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#040e17' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#e8f4f8', marginBottom: 2 }}>All Outcomes</h1>
            <p style={{ fontSize: 13, color: '#6b8fa8' }}>{filtered.length} of {outcomes.length} outcomes</p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={14} /> New Outcome
          </button>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2dd4bf' }}>{selected.size} selected</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#6b8fa8' }}>Move to:</span>
              <select
                value={bulkStage}
                onChange={e => setBulkStage(e.target.value as Stage)}
                style={{ background: '#040e17', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 6, padding: '5px 8px', color: '#e8f4f8', fontSize: 12, outline: 'none' }}
              >
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={bulkMoveStage} style={{ padding: '5px 12px', background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 6, color: '#2dd4bf', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Move</button>
            </div>
            <div style={{ width: 1, height: 20, background: 'rgba(45,212,191,0.15)' }} />
            <button onClick={bulkDelete} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <Trash2 size={12} /> Delete Selected
            </button>
            <button onClick={() => setSelected(new Set())} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6b8fa8', fontSize: 12, cursor: 'pointer' }}>Clear</button>
          </div>
        )}

        {/* Filters */}
        <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search outcomes…"
            style={{ background: '#040e17', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8, padding: '7px 12px', color: '#e8f4f8', fontSize: 13, outline: 'none', minWidth: 180 }}
          />
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <button style={pillBtn(stageFilter === 'ALL')} onClick={() => setStageFilter('ALL')}>All Stages</button>
            {STAGES.map(s => (
              <button key={s} style={pillBtn(stageFilter === s, STAGE_COLORS[s])} onClick={() => setStageFilter(stageFilter === s ? 'ALL' : s)}>{s}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {(['NORMAL', 'AT_RISK', 'EMERGENCY'] as SignalStatus[]).map(s => (
              <button key={s} style={pillBtn(signalFilter === s, SIGNAL_COLORS[s])} onClick={() => setSignalFilter(signalFilter === s ? 'ALL' : s)}>
                {SIGNAL_EMOJI[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => <div key={i} style={{ height: 54, background: '#061c2e', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />)}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
            <h3 style={{ color: '#a8ccd8', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No outcomes found</h3>
            <p style={{ color: '#3a5a6e', fontSize: 13 }}>
              {outcomes.length === 0 ? 'Create your first outcome.' : 'Try adjusting your filters.'}
            </p>
            {outcomes.length === 0 && (
              <button onClick={() => setShowNewModal(true)} style={{ marginTop: 16, padding: '9px 20px', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                + New Outcome
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, padding: '10px 16px', borderBottom: '1px solid rgba(45,212,191,0.08)', background: '#0a2236' }}>
              {/* Select all checkbox */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={selectAll}
                  style={{ width: 14, height: 14, accentColor: '#2dd4bf', cursor: 'pointer' }}
                />
              </div>
              {['Title', 'Stage', 'Signal', 'Impact', 'AI', 'Updated', 'Actions'].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.map((o, idx) => {
                const isEditing = editingId === o.id
                const isExpanded = expandedIds.has(o.id)
                const isConfirmDelete = confirmDeleteId === o.id
                const isSelected = selected.has(o.id)
                const isLast = idx === filtered.length - 1

                if (isEditing) {
                  return (
                    <div key={o.id} style={{ padding: '8px', borderBottom: isLast ? 'none' : '1px solid rgba(45,212,191,0.06)' }}>
                      <EditCard
                        outcome={o}
                        members={members}
                        onSave={updated => {
                          mutate(outcomes.map(x => x.id === updated.id ? updated : x), false)
                          setEditingId(null)
                          addToast('Outcome saved')
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    </div>
                  )
                }

                return (
                  <div key={o.id} style={{ borderBottom: isLast && !isExpanded && !isConfirmDelete ? 'none' : '1px solid rgba(45,212,191,0.06)' }}>
                    {/* Main row */}
                    <div
                      style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, padding: '11px 16px', background: isSelected ? 'rgba(45,212,191,0.04)' : 'transparent', transition: 'background 0.15s' }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(45,212,191,0.025)' }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                    >
                      {/* Checkbox */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(o.id)}
                          style={{ width: 14, height: 14, accentColor: '#2dd4bf', cursor: 'pointer' }}
                        />
                      </div>

                      {/* Title */}
                      <div style={{ minWidth: 0, paddingRight: 8 }}>
                        {o.project && <div style={{ fontSize: 10, color: o.project.color, fontWeight: 600, marginBottom: 2 }}>▸ {o.project.name}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => toggleExpand(o.id)}
                            style={{ background: 'none', border: 'none', color: o.description ? '#6b8fa8' : '#2a4a5e', cursor: o.description ? 'pointer' : 'default', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                            title={o.description ? 'Toggle description' : 'No description'}
                          >
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </button>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#e8f4f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
                          {o.assignee && (
                            <span title={o.assignee.name} style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(45,212,191,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#2dd4bf', fontWeight: 700, flexShrink: 0 }}>
                              {o.assignee.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stage */}
                      <span style={{ fontSize: 10, fontWeight: 700, background: STAGE_COLORS[o.stage] + '22', color: STAGE_COLORS[o.stage], border: `1px solid ${STAGE_COLORS[o.stage]}44`, borderRadius: 4, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em', alignSelf: 'center', display: 'inline-flex', alignItems: 'center', maxHeight: 22, width: 'fit-content' }}>
                        {o.stage}
                      </span>

                      {/* Signal */}
                      <span style={{ fontSize: 13, alignSelf: 'center' }}>{SIGNAL_EMOJI[o.signalStatus]}</span>

                      {/* Impact */}
                      <span style={{ alignSelf: 'center' }}><ImpactDots score={o.impactScore} /></span>

                      {/* AI */}
                      <span style={{ fontSize: 12, color: o.isAiPair ? '#818cf8' : '#3a5a6e', fontWeight: 700, alignSelf: 'center' }}>{o.isAiPair ? '⚡' : '—'}</span>

                      {/* Updated */}
                      <span style={{ fontSize: 11, color: '#6b8fa8', alignSelf: 'center' }}>{timeAgo(o.updatedAt)}</span>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 3, alignSelf: 'center' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => retreatStage(o)}
                          disabled={STAGES.indexOf(o.stage) === 0}
                          title="Retreat stage"
                          style={{ width: 24, height: 24, borderRadius: 5, background: 'rgba(107,143,168,0.1)', border: '1px solid rgba(107,143,168,0.2)', color: '#6b8fa8', cursor: STAGES.indexOf(o.stage) === 0 ? 'not-allowed' : 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >←</button>
                        <button
                          onClick={() => advanceStage(o)}
                          disabled={STAGES.indexOf(o.stage) === STAGES.length - 1}
                          title="Advance stage"
                          style={{ width: 24, height: 24, borderRadius: 5, background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)', color: '#2dd4bf', cursor: STAGES.indexOf(o.stage) === STAGES.length - 1 ? 'not-allowed' : 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >→</button>
                        <button
                          onClick={() => { setEditingId(o.id); setConfirmDeleteId(null) }}
                          title="Edit inline"
                          style={{ width: 24, height: 24, borderRadius: 5, background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.15)', color: '#6b8fa8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#2dd4bf'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(45,212,191,0.4)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b8fa8'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(45,212,191,0.15)' }}
                        ><Pencil size={11} /></button>
                        <button
                          onClick={() => setConfirmDeleteId(isConfirmDelete ? null : o.id)}
                          title="Delete"
                          style={{ width: 24, height: 24, borderRadius: 5, background: 'transparent', border: '1px solid rgba(239,68,68,0.15)', color: '#6b8fa8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.4)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b8fa8'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.15)' }}
                        ><Trash2 size={11} /></button>
                      </div>
                    </div>

                    {/* Description expansion */}
                    {isExpanded && (
                      <div style={{ padding: '10px 16px 14px 52px', borderTop: '1px solid rgba(45,212,191,0.06)', background: 'rgba(45,212,191,0.015)' }}>
                        {o.description ? (
                          <div
                            className="tiptap-editor"
                            style={{ fontSize: 13, color: '#a8ccd8', lineHeight: 1.65 }}
                            dangerouslySetInnerHTML={{ __html: o.description }}
                          />
                        ) : (
                          <span style={{ fontSize: 12, color: '#3a5a6e', fontStyle: 'italic' }}>No description — click Edit (pencil) to add one.</span>
                        )}
                      </div>
                    )}

                    {/* Delete confirmation */}
                    {isConfirmDelete && (
                      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>Delete &ldquo;{o.title.slice(0, 50)}{o.title.length > 50 ? '…' : ''}&rdquo;? This cannot be undone.</p>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 7, color: '#6b8fa8', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                          <button onClick={() => deleteOutcome(o.id)} style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 7, color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* New Outcome Modal */}
      {showNewModal && workspaceId && (
        <NewOutcomeModal
          workspaceId={workspaceId}
          onClose={() => setShowNewModal(false)}
          onCreated={created => {
            mutate([created, ...outcomes], false)
            setShowNewModal(false)
            addToast(`"${created.title.slice(0, 32)}" created`)
          }}
        />
      )}

      {/* Toasts */}
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
