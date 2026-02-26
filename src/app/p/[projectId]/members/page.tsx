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

interface PendingInvite {
  id: string
  email: string
  role: ProjectRole
  expiresAt: string
  inviteUrl: string
  createdAt: string
}

const PROJECT_ROLE_COLORS: Record<ProjectRole, { bg: string; text: string; border: string }> = {
  OUTCOME_OWNER: { bg: 'rgba(45,212,191,0.15)', text: '#2dd4bf', border: 'rgba(45,212,191,0.4)' },
  CONTRIBUTOR: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.4)' },
  VIEWER: { bg: 'rgba(107,143,168,0.12)', text: '#6b8fa8', border: 'rgba(107,143,168,0.3)' },
}

const ROLE_DESCRIPTIONS: Record<ProjectRole, string> = {
  OUTCOME_OWNER: 'Full project control. Can manage members, archive, own any outcome.',
  CONTRIBUTOR: 'Create outcomes, move stages, log signals. Cannot manage members.',
  VIEWER: 'Read-only. Cannot make changes.',
}

function timeUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  return '<1h'
}

export default function ProjectMembersPage() {
  const { projectId, workspaceId, projectName, userRole } = useProject()

  // Add member modal state
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('CONTRIBUTOR')
  const [addingSaving, setAddingSaving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<ProjectRole>('CONTRIBUTOR')
  const [inviting, setInviting] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Revoke confirm
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)

  const [toast, setToast] = useState('')

  const { data: projectMembers = [], mutate, isLoading } = useSWR<ProjectMemberEntry[]>(
    `/api/projects/${projectId}/members`, fetcher
  )

  const { data: wsMembers = [] } = useSWR<WorkspaceMember[]>(
    workspaceId && addMemberOpen ? `/api/members?workspaceId=${workspaceId}` : null, fetcher
  )

  const { data: pendingInvites = [], mutate: mutateInvites } = useSWR<PendingInvite[]>(
    userRole === 'OUTCOME_OWNER' ? `/api/projects/${projectId}/invites` : null,
    fetcher
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

  async function generateInviteLink() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/invites`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (res.ok) {
        setGeneratedLink(data.inviteUrl)
        mutateInvites()
      } else {
        showToast(data.error?.message ?? data.error ?? 'Failed to create invite')
      }
    } finally { setInviting(false) }
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    showToast('Link copied!')
  }

  async function revokeInvite(inviteId: string) {
    setRevoking(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/invites/${inviteId}`, { method: 'DELETE' })
      if (res.ok) { mutateInvites(); setConfirmRevoke(null); showToast('Invite revoked') }
      else { showToast('Failed to revoke') }
    } finally { setRevoking(false) }
  }

  function closeInviteModal() {
    setInviteOpen(false)
    setInviteEmail('')
    setInviteRole('CONTRIBUTOR')
    setGeneratedLink(null)
    setCopied(false)
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
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setInviteOpen(true)}
              style={{ padding: '9px 18px', background: 'rgba(45,212,191,0.15)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.4)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              ✉ Invite Member
            </button>
            {canManage && (
              <button onClick={() => setAddMemberOpen(true)} style={{ padding: '9px 18px', background: 'rgba(45,212,191,0.06)', color: '#6b8fa8', border: '1px solid rgba(45,212,191,0.15)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                + Add Existing
              </button>
            )}
          </div>
        </div>

        {/* Role legend */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {(Object.entries(PROJECT_ROLE_COLORS) as [ProjectRole, typeof PROJECT_ROLE_COLORS[ProjectRole]][]).map(([role, c]) => (
            <span key={role} style={{ fontSize: 11, fontWeight: 700, background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 20, padding: '3px 10px' }}>
              {role.replace('_', ' ')}
            </span>
          ))}
          <span style={{ fontSize: 11, color: '#3a5a6e', alignSelf: 'center', marginLeft: 4 }}>· Project-level roles</span>
        </div>

        {/* Members table */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 60, background: '#061c2e', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />)}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          </div>
        ) : projectMembers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <h3 style={{ color: '#a8ccd8', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No project members yet</h3>
            <p style={{ color: '#3a5a6e', fontSize: 13 }}>Invite people or add workspace members to collaborate.</p>
            <button onClick={() => setInviteOpen(true)} style={{ marginTop: 16, padding: '9px 20px', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✉ Invite First Member</button>
          </div>
        ) : (
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, overflow: 'hidden', marginBottom: 32 }}>
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

        {/* Pending Invites */}
        {canManage && (
          <div style={{ marginTop: 8 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#a8ccd8', marginBottom: 16 }}>
              Pending Invites
              {pendingInvites.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '2px 8px', fontWeight: 600 }}>{pendingInvites.length}</span>
              )}
            </h2>

            {pendingInvites.length === 0 ? (
              <div style={{ padding: '24px', background: '#061c2e', border: '1px solid rgba(45,212,191,0.06)', borderRadius: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#3a5a6e' }}>No pending invites. Generate invite links from the &quot;Invite Member&quot; button.</p>
              </div>
            ) : (
              <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px 120px', padding: '10px 20px', borderBottom: '1px solid rgba(45,212,191,0.08)' }}>
                  {['Email', 'Role', 'Expires', 'Actions'].map(h => (
                    <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#3a5a6e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
                  ))}
                </div>
                {pendingInvites.map((inv, i) => {
                  const c = PROJECT_ROLE_COLORS[inv.role]
                  return (
                    <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px 120px', alignItems: 'center', padding: '12px 20px', borderBottom: i < pendingInvites.length - 1 ? '1px solid rgba(45,212,191,0.06)' : 'none' }}>
                      <span style={{ fontSize: 13, color: '#a8ccd8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.email}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 12, padding: '2px 8px', width: 'fit-content' }}>{inv.role.replace('_', ' ')}</span>
                      <span style={{ fontSize: 12, color: '#6b8fa8' }}>{timeUntil(inv.expiresAt)}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => copyLink(inv.inviteUrl)}
                          title="Copy invite link"
                          style={{ padding: '5px 8px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(45,212,191,0.2)', color: '#2dd4bf', fontSize: 13, cursor: 'pointer' }}>
                          📋
                        </button>
                        {confirmRevoke === inv.id ? (
                          <>
                            <button onClick={() => setConfirmRevoke(null)} style={{ padding: '4px 8px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(107,143,168,0.2)', color: '#6b8fa8', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={() => revokeInvite(inv.id)} disabled={revoking} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Revoke</button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmRevoke(inv.id)}
                            title="Revoke invite"
                            style={{ padding: '5px 8px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(239,68,68,0.15)', color: '#6b8fa8', fontSize: 13, cursor: 'pointer' }}>
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Invite Member Modal ─── */}
      {inviteOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,23,0.85)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) closeInviteModal() }}>
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 14, padding: '28px', width: 460, maxWidth: '95vw' }}>

            {generatedLink ? (
              /* ── Generated link state ── */
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>✓</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2dd4bf', margin: 0 }}>Invite link generated!</h3>
                  </div>
                  <button onClick={closeInviteModal} style={{ background: 'none', border: 'none', color: '#6b8fa8', fontSize: 20, cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1, background: '#040e17', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#a8ccd8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {generatedLink}
                  </div>
                  <button
                    onClick={() => copyLink(generatedLink)}
                    style={{ padding: '10px 14px', background: copied ? 'rgba(45,212,191,0.25)' : 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 64 }}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>

                <p style={{ fontSize: 12, color: '#3a5a6e', marginBottom: 20 }}>This link expires in 7 days.</p>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => { setGeneratedLink(null); setInviteEmail(''); setCopied(false) }}
                    style={{ flex: 1, padding: '10px 0', background: 'transparent', color: '#6b8fa8', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Invite another
                  </button>
                  <button
                    onClick={closeInviteModal}
                    style={{ flex: 1, padding: '10px 0', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Done
                  </button>
                </div>
              </>
            ) : (
              /* ── Form state ── */
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e8f4f8' }}>Invite to {projectName}</h3>
                  <button onClick={closeInviteModal} style={{ background: 'none', border: 'none', color: '#6b8fa8', fontSize: 20, cursor: 'pointer' }}>×</button>
                </div>

                {/* Email */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>Email address</label>
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && inviteEmail.trim()) generateInviteLink() }}
                    style={{ width: '100%', background: '#040e17', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8, padding: '10px 12px', color: '#e8f4f8', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    autoFocus
                  />
                </div>

                {/* Role selector */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 10 }}>Role</label>
                  <div style={{ background: '#040e17', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 10, overflow: 'hidden' }}>
                    {(['OUTCOME_OWNER', 'CONTRIBUTOR', 'VIEWER'] as ProjectRole[]).map((r, idx) => {
                      const c = PROJECT_ROLE_COLORS[r]
                      const selected = inviteRole === r
                      return (
                        <div
                          key={r}
                          onClick={() => setInviteRole(r)}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            padding: '14px 16px',
                            borderBottom: idx < 2 ? '1px solid rgba(45,212,191,0.06)' : 'none',
                            background: selected ? c.bg : 'transparent',
                            cursor: 'pointer', transition: 'background 0.12s',
                          }}>
                          <div style={{ marginTop: 2, width: 16, height: 16, borderRadius: '50%', border: `2px solid ${selected ? c.text : 'rgba(107,143,168,0.3)'}`, background: selected ? c.text : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#040e17' }} />}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: selected ? c.text : '#a8ccd8', marginBottom: 2 }}>{r.replace('_', ' ')}</div>
                            <div style={{ fontSize: 12, color: '#6b8fa8', lineHeight: 1.5 }}>{ROLE_DESCRIPTIONS[r]}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeInviteModal} style={{ flex: 1, padding: '10px 0', background: 'transparent', color: '#6b8fa8', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button
                    onClick={generateInviteLink}
                    disabled={!inviteEmail.trim() || inviting}
                    style={{ flex: 2, padding: '10px 0', background: inviteEmail.trim() ? 'rgba(45,212,191,0.15)' : 'rgba(45,212,191,0.05)', color: inviteEmail.trim() ? '#2dd4bf' : '#3a5a6e', border: `1px solid ${inviteEmail.trim() ? 'rgba(45,212,191,0.4)' : 'rgba(45,212,191,0.1)'}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: inviteEmail.trim() ? 'pointer' : 'not-allowed' }}>
                    {inviting ? 'Generating…' : 'Generate Invite Link'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Add Member Modal ─── */}
      {addMemberOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,23,0.85)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setAddMemberOpen(false) }}>
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 14, padding: '24px', width: 420, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e8f4f8' }}>Add Existing Member</h3>
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
