'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import type { Outcome, Stage, SignalStatus } from '@/types/floq'
import { STAGES, STAGE_COLORS, SIGNAL_COLORS } from '@/types/floq'

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json() })

type OutcomeWithExtras = Outcome & { project?: { id: string; name: string; color: string } | null }

const SIGNAL_EMOJI: Record<SignalStatus, string> = { NORMAL: '🟢', AT_RISK: '🟡', EMERGENCY: '🔴', DELIVERED: '✅' }

function timeAgo(date: string) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function ImpactDots({ score }: { score: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= score ? '#2dd4bf' : 'rgba(45,212,191,0.15)', display: 'inline-block' }} />
      ))}
    </span>
  )
}

export default function OutcomesPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<Stage | 'ALL'>('ALL')
  const [signalFilter, setSignalFilter] = useState<SignalStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const cached = localStorage.getItem('floq_workspaceId')
    if (cached) { setWorkspaceId(cached); return }
    fetch('/api/workspace/init').then(r => r.json()).then(d => { if (d.workspaceId) { localStorage.setItem('floq_workspaceId', d.workspaceId); setWorkspaceId(d.workspaceId) } })
  }, [])

  const { data: outcomes = [], mutate, isLoading } = useSWR<OutcomeWithExtras[]>(
    workspaceId ? `/api/outcomes?workspaceId=${workspaceId}` : null, fetcher
  )

  const filtered = outcomes.filter(o => {
    if (stageFilter !== 'ALL' && o.stage !== stageFilter) return false
    if (signalFilter !== 'ALL' && o.signalStatus !== signalFilter) return false
    if (search && !o.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function advanceStage(o: OutcomeWithExtras) {
    const idx = STAGES.indexOf(o.stage)
    if (idx >= STAGES.length - 1) return
    const stage = STAGES[idx + 1]
    mutate(outcomes.map(x => x.id === o.id ? { ...x, stage } : x), false)
    await fetch(`/api/outcomes/${o.id}/stage`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }) })
    mutate()
  }

  async function retreatStage(o: OutcomeWithExtras) {
    const idx = STAGES.indexOf(o.stage)
    if (idx <= 0) return
    const stage = STAGES[idx - 1]
    mutate(outcomes.map(x => x.id === o.id ? { ...x, stage } : x), false)
    await fetch(`/api/outcomes/${o.id}/stage`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }) })
    mutate()
  }

  const pillBtn = (active: boolean, color?: string) => ({
    padding: '5px 12px', borderRadius: 20, border: `1px solid ${active ? (color ?? '#2dd4bf') : 'rgba(45,212,191,0.15)'}`,
    background: active ? (color ?? '#2dd4bf') + '22' : 'transparent', color: active ? (color ?? '#2dd4bf') : '#6b8fa8',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
  } as React.CSSProperties)

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#040e17' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#e8f4f8', marginBottom: 2 }}>All Outcomes</h1>
            <p style={{ fontSize: 13, color: '#6b8fa8' }}>{filtered.length} of {outcomes.length} outcomes</p>
          </div>
          <a href="/board" style={{ padding: '9px 18px', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>+ New Outcome</a>
        </div>

        {/* Filters */}
        <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {/* Search */}
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search outcomes…"
            style={{ background: '#040e17', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8, padding: '7px 12px', color: '#e8f4f8', fontSize: 13, outline: 'none', minWidth: 180 }}
          />
          {/* Stage filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={pillBtn(stageFilter === 'ALL')} onClick={() => setStageFilter('ALL')}>All Stages</button>
            {STAGES.map(s => (
              <button key={s} style={pillBtn(stageFilter === s, STAGE_COLORS[s])} onClick={() => setStageFilter(stageFilter === s ? 'ALL' : s)}>
                {s}
              </button>
            ))}
          </div>
          {/* Signal filter */}
          <div style={{ display: 'flex', gap: 6 }}>
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
            {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ height: 54, background: '#061c2e', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />)}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
            <h3 style={{ color: '#a8ccd8', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No outcomes found</h3>
            <p style={{ color: '#3a5a6e', fontSize: 13 }}>
              {outcomes.length === 0 ? 'Create your first outcome on the board.' : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 110px 80px 70px 60px 90px 80px', gap: 0, padding: '10px 16px', borderBottom: '1px solid rgba(45,212,191,0.08)', background: '#0a2236' }}>
              {['', 'Title', 'Stage', 'Signal', 'Impact', 'AI', 'Updated', 'Actions'].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</span>
              ))}
            </div>
            {filtered.map((o, idx) => (
              <div
                key={o.id}
                style={{ display: 'grid', gridTemplateColumns: '28px 1fr 110px 80px 70px 60px 90px 80px', gap: 0, padding: '12px 16px', borderBottom: idx < filtered.length - 1 ? '1px solid rgba(45,212,191,0.06)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(45,212,191,0.03)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                onClick={() => setSelectedId(selectedId === o.id ? null : o.id)}
              >
                {/* Signal dot */}
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: SIGNAL_COLORS[o.signalStatus], display: 'inline-block', marginTop: 5 }} />
                {/* Title */}
                <div>
                  {o.project && <div style={{ fontSize: 10, color: o.project.color, fontWeight: 600, marginBottom: 2 }}>▸ {o.project.name}</div>}
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e8f4f8' }}>{o.title}</span>
                </div>
                {/* Stage chip */}
                <span style={{ fontSize: 10, fontWeight: 700, background: STAGE_COLORS[o.stage] + '22', color: STAGE_COLORS[o.stage], border: `1px solid ${STAGE_COLORS[o.stage]}44`, borderRadius: 4, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.06em', alignSelf: 'center', maxHeight: 22, display: 'inline-flex', alignItems: 'center' }}>
                  {o.stage}
                </span>
                {/* Signal text */}
                <span style={{ fontSize: 12, color: SIGNAL_COLORS[o.signalStatus], fontWeight: 600, alignSelf: 'center' }}>{SIGNAL_EMOJI[o.signalStatus]}</span>
                {/* Impact */}
                <span style={{ alignSelf: 'center' }}><ImpactDots score={o.impactScore} /></span>
                {/* AI */}
                <span style={{ fontSize: 11, color: o.isAiPair ? '#818cf8' : '#3a5a6e', fontWeight: 700, alignSelf: 'center' }}>{o.isAiPair ? '⚡' : '—'}</span>
                {/* Updated */}
                <span style={{ fontSize: 11, color: '#6b8fa8', alignSelf: 'center' }}>{timeAgo(o.updatedAt)}</span>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, alignSelf: 'center' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => retreatStage(o)} disabled={STAGES.indexOf(o.stage) === 0} style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(107,143,168,0.1)', border: '1px solid rgba(107,143,168,0.2)', color: '#6b8fa8', cursor: STAGES.indexOf(o.stage) === 0 ? 'not-allowed' : 'pointer', fontSize: 12 }}>←</button>
                  <button onClick={() => advanceStage(o)} disabled={STAGES.indexOf(o.stage) === STAGES.length - 1} style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)', color: '#2dd4bf', cursor: STAGES.indexOf(o.stage) === STAGES.length - 1 ? 'not-allowed' : 'pointer', fontSize: 12 }}>→</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
