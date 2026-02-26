'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import type { Role } from '@/types/floq'

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json() })

type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'COMPLETED'
type ProjectRole = 'OUTCOME_OWNER' | 'CONTRIBUTOR' | 'VIEWER'

interface ProjectMember {
  id: string
  role: ProjectRole
  member: { id: string; name: string; avatarUrl?: string | null; role: Role }
}

interface Project {
  id: string; name: string; description?: string | null; color: string
  status: ProjectStatus; createdAt: string
  _count: { outcomes: number; currents: number }
  projectMembers: ProjectMember[]
}

const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string; border: string }> = {
  ACTIVE: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  COMPLETED: { bg: 'rgba(45,212,191,0.12)', text: '#2dd4bf', border: 'rgba(45,212,191,0.3)' },
  ARCHIVED: { bg: 'rgba(107,143,168,0.1)', text: '#6b8fa8', border: 'rgba(107,143,168,0.2)' },
}

const PRESET_COLORS = ['#2dd4bf', '#6366f1', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6']

function MemberAvatars({ members }: { members: ProjectMember[] }) {
  const shown = members.slice(0, 3)
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((pm, i) => (
        <div key={pm.id} style={{ width: 26, height: 26, borderRadius: '50%', background: pm.member.avatarUrl ? 'transparent' : 'rgba(45,212,191,0.2)', border: '2px solid #061c2e', marginLeft: i > 0 ? -8 : 0, zIndex: shown.length - i, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#2dd4bf', overflow: 'hidden', flexShrink: 0 }}>
          {pm.member.avatarUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={pm.member.avatarUrl} alt={pm.member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : pm.member.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {members.length > 3 && (
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(45,212,191,0.1)', border: '2px solid #061c2e', marginLeft: -8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#6b8fa8', flexShrink: 0 }}>
          +{members.length - 3}
        </div>
      )}
    </div>
  )
}

export default function ProjectsPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#2dd4bf')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const cached = localStorage.getItem('floq_workspaceId')
    if (cached) { setWorkspaceId(cached); return }
    fetch('/api/workspace/init').then(r => r.json()).then(d => { if (d.workspaceId) { localStorage.setItem('floq_workspaceId', d.workspaceId); setWorkspaceId(d.workspaceId) } })
  }, [])

  const { data: projects = [], mutate, isLoading } = useSWR<Project[]>(
    workspaceId ? `/api/projects?workspaceId=${workspaceId}` : null, fetcher
  )

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
      mutate(); setNewOpen(false); setName(''); setDescription(''); setColor('#2dd4bf')
      showToast('Project created')
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
    const sc = STATUS_COLORS[p.status]
    return (
      <div style={{ background: '#061c2e', border: `1px solid ${p.color}22`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = p.color + '44' }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = p.color + '22' }}>
        {/* Top bar */}
        <div style={{ height: 4, background: p.color }} />
        <div style={{ padding: '16px 18px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e8f4f8' }}>{p.name}</h3>
            </div>
            <div style={{ position: 'relative' }}>
              <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id) }} style={{ background: 'none', border: 'none', color: '#6b8fa8', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#a8ccd8' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b8fa8' }}>⋯</button>
              {menuOpen === p.id && (
                <div style={{ position: 'absolute', top: 26, right: 0, background: '#061c2e', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 10, zIndex: 50, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                  {p.status !== 'COMPLETED' && <button onClick={() => updateStatus(p.id, 'COMPLETED')} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#2dd4bf', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>✓ Mark Complete</button>}
                  {p.status !== 'ARCHIVED' && <button onClick={() => updateStatus(p.id, 'ARCHIVED')} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#6b8fa8', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>📦 Archive</button>}
                  {p.status !== 'ACTIVE' && <button onClick={() => updateStatus(p.id, 'ACTIVE')} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#22c55e', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>↺ Reactivate</button>}
                </div>
              )}
            </div>
          </div>
          {p.description && <p style={{ fontSize: 13, color: '#6b8fa8', lineHeight: 1.5, marginBottom: 10 }}>{p.description}</p>}
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b8fa8', marginBottom: 14 }}>
            <span>🎯 {p._count.outcomes} outcomes</span>
            <span>📌 {p._count.currents} currents</span>
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: `1px solid ${p.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MemberAvatars members={p.projectMembers} />
            {p.projectMembers.length > 0 && <span style={{ fontSize: 11, color: '#3a5a6e' }}>{p.projectMembers.length} member{p.projectMembers.length !== 1 ? 's' : ''}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 20, padding: '2px 8px', letterSpacing: '0.06em' }}>{p.status}</span>
            <Link href={`/projects/${p.id}`} style={{ fontSize: 12, fontWeight: 600, color: p.color, textDecoration: 'none', padding: '5px 10px', background: p.color + '15', border: `1px solid ${p.color}33`, borderRadius: 7 }}>Open →</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#040e17' }} onClick={() => setMenuOpen(null)}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#e8f4f8', marginBottom: 2 }}>Projects</h1>
            <p style={{ fontSize: 13, color: '#6b8fa8' }}>{active.length} active · {other.length} archived/completed</p>
          </div>
          <button onClick={e => { e.stopPropagation(); setNewOpen(true) }} style={{ padding: '9px 18px', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + New Project
          </button>
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 200, background: '#061c2e', borderRadius: 14, animation: 'pulse 1.5s infinite' }} />)}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
            <h3 style={{ color: '#a8ccd8', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No projects yet</h3>
            <p style={{ color: '#3a5a6e', fontSize: 13, marginBottom: 20 }}>Projects are top-level containers for your outcomes and currents.</p>
            <button onClick={() => setNewOpen(true)} style={{ padding: '10px 20px', background: 'rgba(45,212,191,0.15)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.35)', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Create First Project</button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Active — {active.length}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16, marginBottom: 28 }}>
                  {active.map(p => <ProjectCard key={p.id} p={p} />)}
                </div>
              </>
            )}
            {other.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Archived / Completed — {other.length}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16, opacity: 0.7 }}>
                  {other.map(p => <ProjectCard key={p.id} p={p} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* New Project Modal */}
      {newOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,14,23,0.85)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setNewOpen(false) }}>
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 14, padding: '28px', width: 440, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e8f4f8' }}>New Project</h3>
              <button onClick={() => setNewOpen(false)} style={{ background: 'none', border: 'none', color: '#6b8fa8', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelSt}>Name</label>
              <input style={inputSt} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Infieldr MVP" autoFocus onKeyDown={e => { if (e.key === 'Enter') createProject() }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelSt}>Description (optional)</label>
              <textarea style={{ ...inputSt, minHeight: 72, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this project about?" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelSt}>Color</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: `3px solid ${color === c ? '#e8f4f8' : 'transparent'}`, cursor: 'pointer', transition: 'border-color 0.15s', padding: 0 }} />
                ))}
              </div>
            </div>
            {/* Preview */}
            <div style={{ marginBottom: 20, padding: '10px 14px', background: '#040e17', border: `1px solid ${color}44`, borderRadius: 8, borderTop: `4px solid ${color}` }}>
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
