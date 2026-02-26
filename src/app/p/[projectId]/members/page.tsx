'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useProject } from '@/contexts/ProjectContext'
import type { Role } from '@/types/floq'

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json() })

type ProjectRole = 'OUTCOME_OWNER' | 'CONTRIBUTOR' | 'VIEWER'

interface ProjectMemberEntry {
  id: string
  role: ProjectRole
  member: { id: string; name: string; email: string; avatarUrl?: string | null; role: Role }
}

interface WorkspaceMember {
  id: string; name: string; email: string; avatarUrl?: string | null; role: Role
}

const PROJECT_ROLE_COLORS: Record<ProjectRole, { bg: string; text: string; border: string }> = {
  OUTCOME_OWNER: { bg: 'rgba(45,212,191,0.15)', text: '#2dd4bf', border: 'rgba(45,212,191,0.4)' },
  CONTRIBUTOR: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.4)' },
  VIEWER: { bg: 'rgba(107,143,168,0.12)', text: '#6b8fa8', border: 'rgba(107,143,168,0.3)' },
}

export default function ProjectMembersPage() {
  const { projectId, workspaceId, projectName, userRole } = useProject()
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('CONTRIBUTOR')
  const [addingSaving, setAddingSaving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const { data: projectMembers = [], mutate, isLoading } = useSWR<ProjectMemberEntry[]>(
    `/api/projects/${projectId}/members`, fetcher
  )

  const { data: wsMembers = [] } = useSWR<WorkspaceMember[]>(
    workspaceId && addMemberOpen ? `/api/members?workspaceId=${workspaceId}` : null, fetcher
  )

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const canManage = userRole === 'OUTCOME_OWNER'

  async function changeProjectRole(memberId: string, role: ProjectRole) {
    const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }),
    })
    if (res.ok) { mutate(); showToast('Role updated') }
  }

  async function removeMember(memberId: string) {
    const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, { method: 'DELETE' })
    if (res.ok) { mutate(); setConfirmRemove(null); showToast('Member removed from project') }
    else { const d = await res.json(); showToast(d.error ?? 'Failed to remove') }
  }

  async function addMember() {
    if (!selectedMemberId) return
    setAddingSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selectedMemberId, role: selectedRole }),
      })
      if (res.ok) { mutate(); setAddMemberOpen(false); setSelectedMemberId(''); showToast('Member added') }
      else { const d = await res.json(); showToast(d.error ?? 'Failed') }
    } finally { setAddingSaving(false) }
  }

  const existingMemberIds = new Set(projectMembers.map(pm => pm.member.id))
  const availableToAdd = wsMembers.filter(m => !existingMemberIds.has(m.id))

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#040e17' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#e8f4f8', marginBottom: 2 }}>Project Members</h1>
            <p style={{ fontSize: 13, color: '#6b8fa8' }}>{projectName} · {projectMembers.length} member{projectMembers.length !== 1 ? 's' : ''}</p>
          </div>
          {canManage && (
            <button onClick={() => setAddMemberOpen(true)} style={{ padding: '9px 18px', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Add Member
            </button>
          )}
        </div>

        {/* Role legend */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {(Object.entries(PROJECT_ROLE_COLORS) as [ProjectRole, typeof PROJECT_ROLE_COLORS[ProjectRole]][]).map(([role, c]) => (
            <span key={role} style={{ fontSize: 11, fontWeight: 700, background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 20, padding: '3px 10px' }}>
              {role.replace('_', ' ')}
            </span>
          ))}
          <span style={{ fontSize: 11, color: '#3a5a6e', alignSelf: 'center', marginLeft: 4 }}>· These are project-level roles, separate from workspace roles</span>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 60, background: '#061c2e', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />)}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          </div>
        ) : projectMembers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <h3 style={{ color: '#a8ccd8', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No project members yet</h3>
            <p style={{ color: '#3a5a6e', fontSize: 13 }}>Add workspace members to this project to collaborate.</p>
            {canManage && <button onClick={() => setAddMemberOpen(true)} style={{ marginTop: 16, padding: '9px 20px', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add First Member</button>}
          </div>
        ) : (
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            {projectMembers.map((pm, i) => {
              const c = PROJECT_ROLE_COLORS[pm.role]
              return (
                <div key={pm.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < projectMembers.length - 1 ? '1px solid rgba(45,212,191,0.06)' : 'none' }}>
                  {pm.member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pm.member.avatarUrl} alt={pm.member.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(45,212,191,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#2dd4bf', flexShrink: 0 }}>{pm.member.name.charAt(0).toUpperCase()}</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f4f8' }}>{pm.member.name}</div>
                    <div style={{ fontSize: 12, color: '#6b8fa8' }}>{pm.member.email}</div>
                  </div>
                  {canManage ? (
                    <select value={pm.role} onChange={e => changeProjectRole(pm.member.id, e.target.value as ProjectRole)} style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                      <option value="OUTCOME_OWNER">Outcome Owner</option>
                      <option value="CONTRIBUTOR">Contributor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 7, padding: '5px 10px' }}>{pm.role.replace('_', ' ')}</span>
                  )}
                  {canManage && (
                    confirmRemove === pm.member.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setConfirmRemove(null)} style={{ padding: '5px 10px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(107,143,168,0.2)', color: '#6b8fa8', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => removeMember(pm.member.id)} style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Confirm Remove</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmRemove(pm.member.id)} style={{ padding: '5px 10px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(239,68,68,0.15)', color: '#6b8fa8', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#ef4444'; b.style.borderColor = 'rgba(239,68,68,0.4)' }}
                        onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#6b8fa8'; b.style.borderColor = 'rgba(239,68,68,0.15)' }}>
                        Remove
                      </button>
                    )
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {addMemberOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,23,0.85)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setAddMemberOpen(false) }}>
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 14, padding: '24px', width: 420, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e8f4f8' }}>Add Member to Project</h3>
              <button onClick={() => setAddMemberOpen(false)} style={{ background: 'none', border: 'none', color: '#6b8fa8', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>Workspace Member</label>
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
                  return (
                    <button key={r} onClick={() => setSelectedRole(r)} style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: `1px solid ${selectedRole === r ? c.border : 'rgba(45,212,191,0.1)'}`, background: selectedRole === r ? c.bg : 'transparent', color: selectedRole === r ? c.text : '#6b8fa8', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      {r.replace('_', ' ')}
                    </button>
                  )
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
