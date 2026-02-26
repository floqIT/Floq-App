'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import type { Stage, SignalStatus, Role } from '@/types/floq'
import { STAGE_COLORS, SIGNAL_COLORS } from '@/types/floq'
import { ROLE_COLORS } from '@/lib/roles'

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json() })

type ProjectRole = 'OUTCOME_OWNER' | 'CONTRIBUTOR' | 'VIEWER'
type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'COMPLETED'

interface ProjectOutcome {
  id: string; title: string; stage: Stage; signalStatus: SignalStatus; impactScore: number; isAiPair: boolean; updatedAt: string
}

interface ProjectMemberEntry {
  id: string
  role: ProjectRole
  member: { id: string; name: string; email: string; avatarUrl?: string | null; role: Role }
}

interface ProjectDetail {
  id: string; name: string; description?: string | null; color: string; status: ProjectStatus
  outcomes: ProjectOutcome[]
  currents: { id: string; name: string; color: string }[]
  projectMembers: ProjectMemberEntry[]
  _count: { outcomes: number; currents: number }
}

interface WorkspaceMember {
  id: string; name: string; email: string; avatarUrl?: string | null; role: Role
}

const PROJECT_ROLE_COLORS: Record<ProjectRole, { bg: string; text: string; border: string }> = {
  OUTCOME_OWNER: { bg: 'rgba(45,212,191,0.15)', text: '#2dd4bf', border: 'rgba(45,212,191,0.4)' },
  CONTRIBUTOR: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.4)' },
  VIEWER: { bg: 'rgba(107,143,168,0.12)', text: '#6b8fa8', border: 'rgba(107,143,168,0.3)' },
}

function ImpactDots({ score }: { score: number }) {
  return <span style={{ display: 'inline-flex', gap: 3 }}>{[1,2,3,4,5].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= score ? '#2dd4bf' : 'rgba(45,212,191,0.15)', display: 'inline-block' }} />)}</span>
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [tab, setTab] = useState<'outcomes' | 'team'>('outcomes')
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('CONTRIBUTOR')
  const [addingSaving, setAddingSaving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const cached = localStorage.getItem('floq_workspaceId')
    if (cached) { setWorkspaceId(cached); return }
    fetch('/api/workspace/init').then(r => r.json()).then(d => { if (d.workspaceId) { localStorage.setItem('floq_workspaceId', d.workspaceId); setWorkspaceId(d.workspaceId) } })
  }, [])

  const { data: project, mutate, isLoading } = useSWR<ProjectDetail>(`/api/projects/${id}`, fetcher)
  const { data: wsMembers = [] } = useSWR<WorkspaceMember[]>(
    workspaceId && addMemberOpen ? `/api/members?workspaceId=${workspaceId}` : null, fetcher
  )

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function changeProjectRole(memberId: string, role: ProjectRole) {
    const res = await fetch(`/api/projects/${id}/members/${memberId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
    if (res.ok) { mutate(); showToast('Role updated') }
  }

  async function removeMember(memberId: string) {
    const res = await fetch(`/api/projects/${id}/members/${memberId}`, { method: 'DELETE' })
    if (res.ok) { mutate(); setConfirmRemove(null); showToast('Member removed') }
  }

  async function addMember() {
    if (!selectedMemberId) return
    setAddingSaving(true)
    try {
      const res = await fetch(`/api/projects/${id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: selectedMemberId, role: selectedRole }) })
      if (res.ok) { mutate(); setAddMemberOpen(false); setSelectedMemberId(''); showToast('Member added') }
      else { const d = await res.json(); showToast(d.error ?? 'Failed') }
    } finally { setAddingSaving(false) }
  }

  if (isLoading) {
    return (
      <div style={{ flex: 1, background: '#040e17', padding: '28px 24px' }}>
        <div style={{ height: 32, width: 200, background: '#061c2e', borderRadius: 8, marginBottom: 16, animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: 200, background: '#061c2e', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ flex: 1, background: '#040e17', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <h3 style={{ color: '#a8ccd8', fontSize: 16 }}>Project not found</h3>
          <Link href="/projects" style={{ color: '#2dd4bf', fontSize: 13 }}>← Back to Projects</Link>
        </div>
      </div>
    )
  }

  const existingMemberIds = new Set(project.projectMembers.map(pm => pm.member.id))
  const availableToAdd = wsMembers.filter(m => !existingMemberIds.has(m.id))
  const statusColors = { ACTIVE: '#22c55e', COMPLETED: '#2dd4bf', ARCHIVED: '#6b8fa8' }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#040e17' }}>
      {/* Top bar */}
      <div style={{ height: 4, background: project.color }} />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: '#3a5a6e', marginBottom: 16 }}>
          <Link href="/projects" style={{ color: '#6b8fa8', textDecoration: 'none' }}>Projects</Link>
          <span style={{ margin: '0 6px' }}>/</span>
          <span style={{ color: '#a8ccd8' }}>{project.name}</span>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: project.color, flexShrink: 0, marginTop: 5 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8f4f8' }}>{project.name}</h1>
              <span style={{ fontSize: 10, fontWeight: 700, color: statusColors[project.status], background: statusColors[project.status] + '18', border: `1px solid ${statusColors[project.status]}33`, borderRadius: 20, padding: '2px 8px', letterSpacing: '0.06em' }}>{project.status}</span>
            </div>
            {project.description && <p style={{ fontSize: 14, color: '#6b8fa8', lineHeight: 1.5 }}>{project.description}</p>}
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#6b8fa8', marginTop: 8 }}>
              <span>🎯 {project._count.outcomes} outcomes</span>
              <span>👥 {project.projectMembers.length} members</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid rgba(45,212,191,0.1)', marginBottom: 20 }}>
          {(['outcomes', 'team'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? '#2dd4bf' : 'transparent'}`, color: tab === t ? '#2dd4bf' : '#6b8fa8', fontSize: 13, fontWeight: tab === t ? 700 : 400, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s' }}>
              {t === 'outcomes' ? `Outcomes (${project.outcomes.length})` : `Team (${project.projectMembers.length})`}
            </button>
          ))}
        </div>

        {/* Outcomes tab */}
        {tab === 'outcomes' && (
          project.outcomes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
              <h3 style={{ color: '#a8ccd8', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No outcomes yet</h3>
              <p style={{ color: '#3a5a6e', fontSize: 13, marginBottom: 16 }}>Create outcomes on the board and assign them to this project.</p>
              <Link href="/board" style={{ padding: '9px 18px', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Go to Board →</Link>
            </div>
          ) : (
            <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, overflow: 'hidden' }}>
              {project.outcomes.map((o, i) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < project.outcomes.length - 1 ? '1px solid rgba(45,212,191,0.06)' : 'none' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: SIGNAL_COLORS[o.signalStatus], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f4f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, background: STAGE_COLORS[o.stage] + '22', color: STAGE_COLORS[o.stage], border: `1px solid ${STAGE_COLORS[o.stage]}44`, borderRadius: 4, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{o.stage}</span>
                  <ImpactDots score={o.impactScore} />
                  {o.isAiPair && <span style={{ fontSize: 10, fontWeight: 700, color: '#818cf8' }}>⚡ AI</span>}
                </div>
              ))}
            </div>
          )
        )}

        {/* Team tab */}
        {tab === 'team' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button onClick={() => setAddMemberOpen(true)} style={{ padding: '8px 16px', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add Member</button>
            </div>
            {project.projectMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                <h3 style={{ color: '#a8ccd8', fontSize: 15, marginBottom: 6 }}>No team members yet</h3>
                <p style={{ color: '#3a5a6e', fontSize: 13 }}>Add workspace members to this project.</p>
              </div>
            ) : (
              <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, overflow: 'hidden' }}>
                {project.projectMembers.map((pm, i) => {
                  const prc = PROJECT_ROLE_COLORS[pm.role]
                  const wrc = ROLE_COLORS[pm.member.role]
                  return (
                    <div key={pm.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < project.projectMembers.length - 1 ? '1px solid rgba(45,212,191,0.06)' : 'none' }}>
                      {pm.member.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pm.member.avatarUrl} alt={pm.member.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(45,212,191,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#2dd4bf', flexShrink: 0 }}>
                          {pm.member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f4f8' }}>{pm.member.name}</div>
                        <div style={{ fontSize: 12, color: '#6b8fa8' }}>{pm.member.email}</div>
                      </div>
                      {/* Workspace role badge */}
                      <span style={{ fontSize: 10, fontWeight: 700, background: wrc.bg, color: wrc.text, border: `1px solid ${wrc.border}`, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap', display: 'none' }}>{pm.member.role}</span>
                      {/* Project role selector */}
                      <select value={pm.role} onChange={e => changeProjectRole(pm.member.id, e.target.value as ProjectRole)} style={{ background: prc.bg, color: prc.text, border: `1px solid ${prc.border}`, borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                        <option value="OUTCOME_OWNER">Outcome Owner</option>
                        <option value="CONTRIBUTOR">Contributor</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      {confirmRemove === pm.member.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setConfirmRemove(null)} style={{ padding: '5px 10px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(107,143,168,0.2)', color: '#6b8fa8', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                          <button onClick={() => removeMember(pm.member.id)} style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Confirm</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmRemove(pm.member.id)} style={{ padding: '5px 10px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(239,68,68,0.15)', color: '#6b8fa8', fontSize: 12, cursor: 'pointer' }}
                          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#ef4444'; b.style.borderColor = 'rgba(239,68,68,0.4)' }}
                          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#6b8fa8'; b.style.borderColor = 'rgba(239,68,68,0.15)' }}>
                          Remove
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {addMemberOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,23,0.85)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setAddMemberOpen(false) }}>
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 14, padding: '24px', width: 400, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e8f4f8' }}>Add Member to Project</h3>
              <button onClick={() => setAddMemberOpen(false)} style={{ background: 'none', border: 'none', color: '#6b8fa8', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>Member</label>
              <select value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)} style={{ width: '100%', background: '#040e17', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8, padding: '9px 12px', color: '#e8f4f8', fontSize: 13, outline: 'none' }}>
                <option value="">Select a member…</option>
                {availableToAdd.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
              </select>
              {availableToAdd.length === 0 && <p style={{ fontSize: 12, color: '#3a5a6e', marginTop: 6 }}>All workspace members are already in this project.</p>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>Project Role</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['OUTCOME_OWNER', 'CONTRIBUTOR', 'VIEWER'] as ProjectRole[]).map(r => {
                  const c = PROJECT_ROLE_COLORS[r]
                  return <button key={r} onClick={() => setSelectedRole(r)} style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: `1px solid ${selectedRole === r ? c.border : 'rgba(45,212,191,0.1)'}`, background: selectedRole === r ? c.bg : 'transparent', color: selectedRole === r ? c.text : '#6b8fa8', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{r.replace('_', ' ')}</button>
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setAddMemberOpen(false)} style={{ flex: 1, padding: '10px 0', background: 'transparent', color: '#6b8fa8', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addMember} disabled={!selectedMemberId || addingSaving} style={{ flex: 2, padding: '10px 0', background: selectedMemberId ? 'rgba(45,212,191,0.15)' : 'rgba(45,212,191,0.05)', color: selectedMemberId ? '#2dd4bf' : '#3a5a6e', border: `1px solid ${selectedMemberId ? 'rgba(45,212,191,0.4)' : 'rgba(45,212,191,0.1)'}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: selectedMemberId ? 'pointer' : 'not-allowed' }}>
                {addingSaving ? 'Adding…' : 'Add to Project'}
              </button>
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
