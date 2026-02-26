'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import type { Role } from '@/types/floq'
import { ROLE_LABELS, ROLE_COLORS, isAdmin } from '@/lib/roles'

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json() })

interface Member {
  id: string; name: string; email: string; role: Role; avatarUrl?: string | null; createdAt: string
}

function Avatar({ member }: { member: Member }) {
  return member.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={member.avatarUrl} alt={member.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
  ) : (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(45,212,191,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#2dd4bf' }}>
      {member.name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function MembersPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [myRole, setMyRole] = useState<Role | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const cached = localStorage.getItem('floq_workspaceId')
    if (cached) { setWorkspaceId(cached); return }
    fetch('/api/workspace/init').then(r => r.json()).then(d => { if (d.workspaceId) { localStorage.setItem('floq_workspaceId', d.workspaceId); setWorkspaceId(d.workspaceId) } })
  }, [])

  const { data: members = [], mutate, isLoading } = useSWR<Member[]>(
    workspaceId ? `/api/members?workspaceId=${workspaceId}` : null, fetcher
  )

  useEffect(() => {
    if (members.length > 0 && !myRole) {
      const myId = typeof window !== 'undefined' ? localStorage.getItem('floq_memberId') : null
      if (myId) { const me = members.find(m => m.id === myId); if (me) setMyRole(me.role) }
    }
  }, [members, myRole])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function changeRole(memberId: string, role: Role) {
    const res = await fetch(`/api/members/${memberId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
    if (res.ok) { mutate(); showToast('Role updated') }
  }

  async function removeMember(memberId: string) {
    const res = await fetch(`/api/members/${memberId}`, { method: 'DELETE' })
    if (res.ok) { mutate(); setConfirmRemove(null); showToast('Member removed') }
    else { const d = await res.json(); showToast(d.error ?? 'Failed to remove') }
  }

  function copyInviteLink() {
    const url = `${window.location.origin}/sign-up`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const canManage = myRole ? isAdmin(myRole) : true // assume admin while loading

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#040e17' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#e8f4f8', marginBottom: 2 }}>Team Members</h1>
            <p style={{ fontSize: 13, color: '#6b8fa8' }}>{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
          {canManage && (
            <button onClick={() => setInviteOpen(true)} style={{ padding: '9px 18px', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Invite Member
            </button>
          )}
        </div>

        {/* Role legend */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([role, label]) => {
            const c = ROLE_COLORS[role]
            return (
              <span key={role} style={{ fontSize: 11, fontWeight: 700, background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 20, padding: '3px 10px' }}>{label}</span>
            )
          })}
        </div>

        {/* Table */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 60, background: '#061c2e', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />)}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          </div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <h3 style={{ color: '#a8ccd8', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No members yet</h3>
            <p style={{ color: '#3a5a6e', fontSize: 13 }}>Invite your team to get started.</p>
          </div>
        ) : (
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            {members.map((m, i) => {
              const c = ROLE_COLORS[m.role]
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < members.length - 1 ? '1px solid rgba(45,212,191,0.06)' : 'none' }}>
                  <Avatar member={m} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f4f8' }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: '#6b8fa8' }}>{m.email}</div>
                  </div>
                  {canManage ? (
                    <select
                      value={m.role}
                      onChange={e => changeRole(m.id, e.target.value as Role)}
                      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none' }}
                    >
                      {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 7, padding: '5px 10px' }}>{ROLE_LABELS[m.role]}</span>
                  )}
                  <span style={{ fontSize: 11, color: '#3a5a6e', minWidth: 70 }}>{new Date(m.createdAt).toLocaleDateString()}</span>
                  {canManage && (
                    confirmRemove === m.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setConfirmRemove(null)} style={{ padding: '5px 10px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(107,143,168,0.2)', color: '#6b8fa8', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => removeMember(m.id)} style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Confirm</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmRemove(m.id)} style={{ padding: '5px 10px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(239,68,68,0.15)', color: '#6b8fa8', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
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

      {/* Invite modal */}
      {inviteOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,23,0.85)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setInviteOpen(false) }}>
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 14, padding: '28px', width: 400, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e8f4f8' }}>Invite Member</h3>
              <button onClick={() => setInviteOpen(false)} style={{ background: 'none', border: 'none', color: '#6b8fa8', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: '#a8ccd8', lineHeight: 1.5, marginBottom: 20 }}>
              Share your workspace sign-up link. New members will automatically join your workspace on first login.
            </p>
            <div style={{ background: '#040e17', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#6b8fa8', marginBottom: 16, wordBreak: 'break-all' }}>
              {typeof window !== 'undefined' ? `${window.location.origin}/sign-up` : '…'}
            </div>
            <button onClick={copyInviteLink} style={{ width: '100%', padding: '10px 0', background: copiedLink ? 'rgba(45,212,191,0.2)' : 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, color: '#2dd4bf', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {copiedLink ? '✓ Copied!' : 'Copy Invite Link'}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, padding: '10px 16px', borderRadius: 8, background: '#061c2e', border: '1px solid rgba(45,212,191,0.4)', color: '#2dd4bf', fontSize: 13, fontWeight: 600 }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
