import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { isAdmin } from '@/lib/roles'
import type { Stage, SignalStatus } from '@/types/floq'
import { STAGE_COLORS, SIGNAL_COLORS } from '@/types/floq'

function timeAgo(date: string | Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function getGreeting(): string {
  const h = new Date().getUTCHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const clerkUser = await currentUser()

  const member = await prisma.member.findFirst({
    where: { clerkUserId: userId },
    include: { workspace: true },
  })
  if (!member) redirect('/board')

  const [outcomes, members, activeWindow, projects] = await Promise.all([
    prisma.outcome.findMany({
      where: { workspaceId: member.workspaceId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: { project: { select: { id: true, name: true, color: true } } },
    }),
    prisma.member.findMany({ where: { workspaceId: member.workspaceId } }),
    prisma.focusWindow.findFirst({
      where: { workspaceId: member.workspaceId, isActive: true },
      include: { _count: { select: { focusOutcomes: true } } },
    }),
    prisma.project.findMany({
      where: { workspaceId: member.workspaceId, status: 'ACTIVE' },
      take: 3,
      include: { _count: { select: { outcomes: true } } },
    }),
  ])

  const total = outcomes.length
  const active = outcomes.filter(o => o.stage !== 'DELIVER' && o.stage !== 'PIVOT').length
  const atRisk = outcomes.filter(o => o.signalStatus === 'AT_RISK').length
  const emergency = outcomes.filter(o => o.signalStatus === 'EMERGENCY').length

  const stageCounts = Object.fromEntries(
    ['IDEATE', 'IDENTIFY', 'SHAPE', 'BUILD', 'SHIP', 'MEASURE', 'DELIVER', 'PIVOT'].map(s => [s, outcomes.filter(o => o.stage === s).length])
  ) as Record<Stage, number>

  const recent = outcomes.slice(0, 5)
  const firstName = member.name.split(' ')[0] ?? clerkUser?.firstName ?? 'there'

  const statCards = [
    { label: 'Total Outcomes', value: total, color: '#2dd4bf' },
    { label: 'Active', value: active, color: '#3b82f6' },
    { label: 'At Risk', value: atRisk, color: '#f59e0b' },
    { label: 'Emergency', value: emergency, color: '#ef4444' },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#040e17' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {/* Greeting */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#e8f4f8', marginBottom: 4 }}>
            {getGreeting()}, {firstName} 👋
          </h1>
          <p style={{ fontSize: 14, color: '#6b8fa8' }}>
            {member.workspace.name} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
          {statCards.map(card => (
            <div key={card.label} style={{ background: '#061c2e', border: `1px solid ${card.color}22`, borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Stage breakdown */}
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, padding: '20px 22px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#a8ccd8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stage Breakdown</h3>
            {total === 0 ? (
              <p style={{ color: '#3a5a6e', fontSize: 13, fontStyle: 'italic' }}>No outcomes yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(Object.entries(stageCounts) as [Stage, number][]).map(([stage, count]) => (
                  <div key={stage}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: STAGE_COLORS[stage], textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stage}</span>
                      <span style={{ fontSize: 11, color: '#6b8fa8' }}>{count}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${total > 0 ? (count / total) * 100 : 0}%`, background: STAGE_COLORS[stage], borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, padding: '20px 22px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#a8ccd8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recent Activity</h3>
            {recent.length === 0 ? (
              <p style={{ color: '#3a5a6e', fontSize: 13, fontStyle: 'italic' }}>No outcomes yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recent.map(o => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: SIGNAL_COLORS[o.signalStatus as SignalStatus], flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#e8f4f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</div>
                      <div style={{ fontSize: 10, color: '#6b8fa8', marginTop: 1 }}>
                        <span style={{ color: STAGE_COLORS[o.stage as Stage] }}>{o.stage}</span>
                        {o.project && <span style={{ color: o.project.color }}> · {o.project.name}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#3a5a6e', flexShrink: 0 }}>{timeAgo(o.updatedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Admin section + quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: isAdmin(member.role) ? '1fr 1fr' : '1fr', gap: 20 }}>
          {/* Quick actions */}
          <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, padding: '20px 22px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#a8ccd8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Link href="/board" style={{ padding: '9px 16px', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>🗂 View Board →</Link>
              <Link href="/outcomes" style={{ padding: '9px 16px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>📋 All Outcomes →</Link>
              <Link href="/projects" style={{ padding: '9px 16px', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>📁 Projects →</Link>
              <Link href="/windows" style={{ padding: '9px 16px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>⏱ Focus Windows →</Link>
            </div>
          </div>

          {/* Admin section */}
          {isAdmin(member.role) && (
            <div style={{ background: '#061c2e', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: '20px 22px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#818cf8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin Overview</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#6b8fa8' }}>Team size</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e8f4f8' }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#6b8fa8' }}>Active projects</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e8f4f8' }}>{projects.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#6b8fa8' }}>Active focus window</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: activeWindow ? '#2dd4bf' : '#3a5a6e' }}>{activeWindow ? activeWindow.name : 'None'}</span>
                </div>
                {activeWindow && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#6b8fa8' }}>Outcomes in window</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e8f4f8' }}>{activeWindow._count.focusOutcomes}</span>
                  </div>
                )}
                {projects.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid rgba(45,212,191,0.08)' }}>
                    <div style={{ fontSize: 11, color: '#6b8fa8', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Projects</div>
                    {projects.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#a8ccd8', flex: 1 }}>{p.name}</span>
                        <span style={{ fontSize: 11, color: '#6b8fa8' }}>{p._count.outcomes} outcomes</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
