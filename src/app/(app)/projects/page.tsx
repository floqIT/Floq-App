'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import type { Role } from '@/types/floq'

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json() })

type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'COMPLETED'
type ProjectRole = 'OUTCOME_OWNER' | 'CONTRIBUTOR' | 'VIEWER'

interface ProjectMember {
  id: string; role: ProjectRole
  member: { id: string; name: string; avatarUrl?: string | null; role: Role }
}

interface Project {
  id: string; name: string; description?: string | null; color: string
  status: ProjectStatus; createdAt: string
  _count: { outcomes: number; currents: number }
  projectMembers: ProjectMember[]
}

const STATUS_STYLES: Record<ProjectStatus, { bg: string; text: string; border: string; label: string }> = {
  ACTIVE:    { bg: 'rgba(34,197,94,0.12)',    text: '#22c55e', border: 'rgba(34,197,94,0.3)',    label: 'ACTIVE' },
  COMPLETED: { bg: 'rgba(45,212,191,0.12)',   text: '#2dd4bf', border: 'rgba(45,212,191,0.3)',   label: 'COMPLETED' },
  ARCHIVED:  { bg: 'rgba(107,143,168,0.1)',   text: '#6b8fa8', border: 'rgba(107,143,168,0.2)',  label: 'ARCHIVED' },
}

const ROLE_COLORS: Record<ProjectRole, string> = {
  OUTCOME_OWNER: '#2dd4bf',
  CONTRIBUTOR: '#f59e0b',
  VIEWER: '#6b8fa8',
}

const PRESET_COLORS = ['#2dd4bf', '#6366f1', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6']

function MemberAvatars({ members }: { members: ProjectMember[] }) {
  const shown = members.slice(0, 4)
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((pm, i) => (
        <div key={pm.id} title={pm.member.name} style={{ width: 24, height: 24, borderRadius: '50%', background: pm.member.avatarUrl ? 'transparent' : 'rgba(45,212,191,0.2)', border: '2px solid #061c2e', marginLeft: i > 0 ? -8 : 0, zIndex: shown.length - i, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#2dd4bf', overflow: 'hidden', flexShrink: 0 }}>
          {pm.member.avatarUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={pm.member.avatarUrl} alt={pm.member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : pm.member.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {members.length > 4 && (
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(45,212,191,0.1)', border: '2px solid #061c2e', marginLeft: -8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#6b8fa8', flexShrink: 0 }}>+{members.length - 4}</div>
      )}
    </div>
  )
}

export default function ProjectsPage() {
  const router = useRouter()
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [autoRedirected, setAutoRedirected] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#2dd4bf')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const cached = localStorage.getItem('floq_workspaceId')
    if (cached) { setWorkspaceId(cached); return }
    fetch('/api/workspace/init').then(r => r.json()).then(d => {
      if (d.workspaceId) { localStorage.setItem('floq_workspaceId', d.workspaceId); setWorkspaceId(d.workspaceId) }
    })
  }, [])

  const { data: projects = [], mutate, isLoading } = useSWR<Project[]>(
    workspaceId ? `/api/projects?workspaceId=${workspaceId}` : null, fetcher
  )

  // Auto-redirect if exactly 1 project
  useEffect(() => {
    if (!isLoading && projects.length === 1 && !autoRedirected) {
      setAutoRedirected(true)
      router.replace(`/p/${projects[0].id}/dashboard`)
    }
  }, [projects, isLoading, autoRedirected, router])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function createProject() {
    if (!name.trim() || !workspaceId) return
    setSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, color, workspaceId }),
      })
      if (!res.ok) { const d = await res.json(); showToast(d.error ?? 'Failed'); return }
      const created = await res.json()
      mutate(); setNewOpen(false); setName(''); setDescription(''); setColor('#2dd4bf')
      showToast('Project created')
      // Navigate directly into the new project
      router.push(`/p/${created.id}/dashboard`)
    } finally { setSaving(false) }
  }

  async function updateStatus(id: string, status: ProjectStatus) {
    const res = await fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    if (res.ok) { mutate(); setMenuOpen(null); showToast(`Project ${status.toLowerCase()}`) }
  }

  const active = projects.filter(p => p.status === 'ACTIVE')
  const other = projects.filter(p => p.status !== 'ACTIVE')

  const inputSt: React.CSSProperties = { background: '#040e17', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8, padding: '9px 12px', color: '#e8f4f8', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const labelSt: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, display: 'block' }

  function ProjectCard({ p }: { p: Project }) {
    const sc = STATUS_STYLES[p.status]
    const myRole = p.projectMembers[0]?.role
    const roleColor = myRole ? ROLE_COLORS[myRole] : '#6b8fa8'
    const [hovered, setHovered] = useState(false)

    return (
      <div
        style={{
          background: '#061c2e',
          border: `1px solid ${hovered ? p.color + '55' : p.color + '22'}`,
          borderLeft: `3px solid ${p.color}`,
          borderRadius: 12,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: hovered ? `0 0 20px ${p.color}18` : 'none',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ padding: '18px 18px 14px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0, boxShadow: `0 0 6px ${p.color}88` }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e8f4f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 20, padding: '2px 8px', letterSpacing: '0.06em' }}>{sc.label}</span>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id) }}
                  style={{ background: 'none', border: 'none', color: '#6b8fa8', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#a8ccd8' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b8fa8' }}
                >⋯</button>
                {menuOpen === p.id && (
                  <div style={{ position: 'absolute', top: 28, right: 0, background: '#061c2e', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 10, zIndex: 50, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                    {p.status !== 'COMPLETED' && <button onClick={() => updateStatus(p.id, 'COMPLETED')} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#2dd4bf', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>✓ Mark Complete</button>}
                    {p.status !== 'ARCHIVED' && <button onClick={() => updateStatus(p.id, 'ARCHIVED')} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#6b8fa8', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>📦 Archive</button>}
                    {p.status !== 'ACTIVE' && <button onClick={() => updateStatus(p.id, 'ACTIVE')} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#22c55e', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>↺ Reactivate</button>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {p.description && <p style={{ fontSize: 13, color: '#6b8fa8', lineHeight: 1.5, marginBottom: 12 }}>{p.description}</p>}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b8fa8', marginBottom: 12 }}>
            <span>🎯 <span style={{ color: '#a8ccd8', fontWeight: 600 }}>{p._count.outcomes}</span> outcomes</span>
            <span>👥 <span style={{ color: '#a8ccd8', fontWeight: 600 }}>{p.projectMembers.length}</span> members</span>
          </div>

          {/* Role + members row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <MemberAvatars members={p.projectMembers} />
            {myRole && (
              <span style={{ fontSize: 10, fontWeight: 700, color: roleColor, background: `${roleColor}15`, border: `1px solid ${roleColor}33`, borderRadius: 20, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {myRole.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Enter button */}
        <Link
          href={`/p/${p.id}/dashboard`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '12px 0',
            background: hovered ? p.color + '22' : 'rgba(45,212,191,0.04)',
            borderTop: `1px solid ${p.color}22`,
            color: hovered ? p.color : '#6b8fa8',
            textDecoration: 'none',
            fontSize: 13, fontWeight: 700,
            transition: 'all 0.2s',
          }}
        >
          Enter Project →
        </Link>
      </div>
    )
  }

  // If redirecting to single project
  if (!isLoading && projects.length === 1 && !autoRedirected) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040e17' }}>
        <div style={{ textAlign: 'center', color: '#6b8fa8', fontSize: 14 }}>Entering project…</div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#040e17' }} onClick={() => setMenuOpen(null)}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#e8f4f8', marginBottom: 4, letterSpacing: '-0.02em' }}>Your Projects</h1>
            <p style={{ fontSize: 14, color: '#6b8fa8' }}>Select a project to start flowing</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); setNewOpen(true) }}
            style={{ padding: '10px 20px', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.35)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
          >
            + New Project
          </button>
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 220, background: '#061c2e', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />)}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>🚀</div>
            <h3 style={{ color: '#e8f4f8', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No projects yet</h3>
            <p style={{ color: '#6b8fa8', fontSize: 14, marginBottom: 28, maxWidth: 360, margin: '0 auto 28px' }}>
              Create your first project to start flowing. Projects are top-level containers for your outcomes, focus windows, and team.
            </p>
            <button
              onClick={() => setNewOpen(true)}
              style={{ padding: '12px 28px', background: 'rgba(45,212,191,0.15)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.4)', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              Create First Project
            </button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>
                  Active — {active.length}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {active.map(p => <ProjectCard key={p.id} p={p} />)}
                </div>
              </div>
            )}
            {other.length > 0 && (
              <div style={{ opacity: 0.7 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>
                  Archived / Completed — {other.length}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {other.map(p => <ProjectCard key={p.id} p={p} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* New Project Modal */}
      {newOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,23,0.88)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setNewOpen(false) }}>
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 14, padding: '28px', width: 440, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e8f4f8' }}>New Project</h3>
              <button onClick={() => setNewOpen(false)} style={{ background: 'none', border: 'none', color: '#6b8fa8', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}><label style={labelSt}>Name</label><input style={inputSt} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Infieldr MVP" autoFocus onKeyDown={e => { if (e.key === 'Enter') createProject() }} /></div>
            <div style={{ marginBottom: 14 }}><label style={labelSt}>Description (optional)</label><textarea style={{ ...inputSt, minHeight: 72, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this project about?" /></div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelSt}>Color</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: `3px solid ${color === c ? '#e8f4f8' : 'transparent'}`, cursor: 'pointer', transition: 'border-color 0.15s', padding: 0, boxShadow: color === c ? `0 0 10px ${c}99` : 'none' }} />
                ))}
              </div>
            </div>
            {/* Preview */}
            <div style={{ marginBottom: 20, padding: '10px 14px', background: '#040e17', border: `1px solid ${color}44`, borderRadius: 8, borderLeft: `4px solid ${color}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f4f8' }}>{name || 'Project name'}</div>
              {description && <div style={{ fontSize: 12, color: '#6b8fa8', marginTop: 2 }}>{description}</div>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setNewOpen(false)} style={{ flex: 1, padding: '10px 0', background: 'transparent', color: '#6b8fa8', border: '1px solid rgba(107,143,168,0.2)', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createProject} disabled={!name.trim() || saving} style={{ flex: 2, padding: '10px 0', background: name.trim() ? 'rgba(45,212,191,0.15)' : 'rgba(45,212,191,0.05)', color: name.trim() ? '#2dd4bf' : '#3a5a6e', border: `1px solid ${name.trim() ? 'rgba(45,212,191,0.4)' : 'rgba(45,212,191,0.1)'}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
                {saving ? 'Creating…' : 'Create Project'}
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
