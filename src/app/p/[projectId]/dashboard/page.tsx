import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import type { Stage, SignalStatus } from '@/types/floq'
import { STAGE_COLORS, STAGES, SIGNAL_COLORS } from '@/types/floq'
import DashboardActions from './DashboardActions'

function greeting() {
  const h = new Date().getUTCHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'
}

function timeAgo(date: Date | string) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { projectId } = await params

  const member = await prisma.member.findFirst({ where: { clerkUserId: userId } })
  if (!member) redirect('/projects')

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      projectMembers: {
        include: { member: { select: { id: true, name: true, avatarUrl: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!project || project.workspaceId !== member.workspaceId) redirect('/projects')

  // All outcomes in this project
  const outcomes = await prisma.outcome.findMany({
    where: { projectId, workspaceId: member.workspaceId },
    orderBy: { updatedAt: 'desc' },
  })

  // Stats
  const total = outcomes.length
  const active = outcomes.filter(o => o.stage !== 'DELIVER' && o.stage !== 'PIVOT').length
  const atRisk = outcomes.filter(o => o.signalStatus === 'AT_RISK').length
  const emergency = outcomes.filter(o => o.signalStatus === 'EMERGENCY').length

  // Stage counts
  const stageCounts: Record<Stage, number> = {
    IDEATE: 0, IDENTIFY: 0, SHAPE: 0, BUILD: 0, QA: 0, SHIP: 0, MEASURE: 0, DELIVER: 0, PIVOT: 0,
  }
  for (const o of outcomes) stageCounts[o.stage as Stage]++
  const maxStageCount = Math.max(...Object.values(stageCounts), 1)

  // Recent activity (last 5 updated)
  const recent = outcomes.slice(0, 5)

  // Active focus window
  const activeWindow = await prisma.focusWindow.findFirst({
    where: { workspaceId: member.workspaceId, projectId, isActive: true },
    include: {
      focusOutcomes: {
        include: { outcome: { select: { id: true, stage: true } } },
      },
      _count: { select: { focusOutcomes: true } },
    },
    orderBy: { startDate: 'desc' },
  })

  // User's display name
  const displayName = member.name.split(' ')[0] || member.name

  // Project role for this user
  const myProjectRole = project.projectMembers.find(pm => pm.memberId === member.id)?.role

  // Show members for owner/contributor
  const showMembers = myProjectRole !== 'VIEWER'

  // Window stats
  let windowDeliveredPct = 0
  if (activeWindow && activeWindow._count.focusOutcomes > 0) {
    const delivered = activeWindow.focusOutcomes.filter(fo => fo.outcome.stage === 'DELIVER').length
    windowDeliveredPct = Math.round((delivered / activeWindow._count.focusOutcomes) * 100)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#040e17' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8f4f8', marginBottom: 4 }}>
            {greeting()},{' '}
            <span style={{ color: '#2dd4bf' }}>{displayName}</span> 👋
          </h1>
          <p style={{ fontSize: 14, color: '#6b8fa8' }}>
            You&apos;re viewing{' '}
            <span style={{ color: project.color, fontWeight: 600 }}>{project.name}</span>
          </p>
        </div>

        {/* Active Focus Window banner */}
        {activeWindow && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(45,212,191,0.08) 0%, rgba(45,212,191,0.04) 100%)',
              border: '1px solid rgba(45,212,191,0.25)',
              borderRadius: 12,
              padding: '14px 20px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: '2px 8px', letterSpacing: '0.08em' }}>ACTIVE FLOW</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#e8f4f8' }}>{activeWindow.name}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b8fa8' }}>
                {formatDate(activeWindow.startDate)} → {formatDate(activeWindow.endDate)}
                <span style={{ margin: '0 8px', color: '#2a4a5e' }}>·</span>
                <span style={{ color: '#2dd4bf', fontWeight: 600 }}>{windowDeliveredPct}% delivered</span>
                <span style={{ margin: '0 8px', color: '#2a4a5e' }}>·</span>
                {activeWindow._count.focusOutcomes} outcomes in cycle
              </div>
            </div>
            {/* Mini progress bar */}
            <div style={{ width: 120, flexShrink: 0 }}>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                <div
                  style={{
                    height: '100%',
                    width: `${windowDeliveredPct}%`,
                    background: windowDeliveredPct === 100 ? '#22c55e' : '#2dd4bf',
                    borderRadius: 3,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: 10, color: '#3a5a6e', textAlign: 'right' }}>{windowDeliveredPct}% flow rate</div>
            </div>
            <Link
              href={`/p/${projectId}/windows`}
              style={{
                fontSize: 12, fontWeight: 700, color: '#2dd4bf',
                textDecoration: 'none', padding: '6px 12px',
                background: 'rgba(45,212,191,0.1)',
                border: '1px solid rgba(45,212,191,0.25)',
                borderRadius: 7,
                whiteSpace: 'nowrap',
              }}
            >
              View Window →
            </Link>
          </div>
        )}

        {/* Stat cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
            marginBottom: 24,
          }}
        >
          {[
            { label: 'Total Outcomes', value: total, color: '#2dd4bf', icon: '🎯', pulse: false },
            { label: 'Active', value: active, color: '#3b82f6', icon: '▶', pulse: false, sub: 'not delivered/pivot' },
            { label: 'At Risk', value: atRisk, color: '#f59e0b', icon: '🟡', pulse: false },
            { label: 'Emergency', value: emergency, color: '#ef4444', icon: '🔴', pulse: emergency > 0 },
          ].map(card => (
            <div
              key={card.label}
              style={{
                background: '#061c2e',
                border: `1px solid ${card.color}22`,
                borderRadius: 12,
                padding: '18px 20px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {card.pulse && emergency > 0 && (
                <div
                  style={{
                    position: 'absolute', top: 12, right: 14,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#ef4444',
                    animation: 'pulse-ring 1.5s ease-out infinite',
                  }}
                />
              )}
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, color: card.color, lineHeight: 1, marginBottom: card.sub ? 4 : 0 }}>
                {card.value}
              </div>
              {card.sub && <div style={{ fontSize: 10, color: '#3a5a6e', marginTop: 4 }}>{card.sub}</div>}
            </div>
          ))}
        </div>

        {/* Main grid: stage funnel + recent activity */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
            marginBottom: 24,
          }}
        >
          {/* Stage Funnel */}
          <div
            style={{
              background: '#061c2e',
              border: '1px solid rgba(45,212,191,0.1)',
              borderRadius: 12,
              padding: '20px 22px',
            }}
          >
            <h3 style={{ fontSize: 11, fontWeight: 700, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18 }}>
              Stage Funnel
            </h3>
            {total === 0 ? (
              <p style={{ fontSize: 13, color: '#3a5a6e', fontStyle: 'italic' }}>No outcomes yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {STAGES.map(stage => {
                  const count = stageCounts[stage]
                  const pct = (count / maxStageCount) * 100
                  return (
                    <div key={stage}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: STAGE_COLORS[stage], textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stage}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: count > 0 ? '#a8ccd8' : '#3a5a6e' }}>{count}</span>
                      </div>
                      <div style={{ height: 7, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%', width: `${pct}%`,
                            background: STAGE_COLORS[stage], borderRadius: 4,
                            opacity: count > 0 ? 1 : 0.15,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div
            style={{
              background: '#061c2e',
              border: '1px solid rgba(45,212,191,0.1)',
              borderRadius: 12,
              padding: '20px 22px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Recent Activity
              </h3>
              <Link href={`/p/${projectId}/outcomes`} style={{ fontSize: 11, color: '#2dd4bf', textDecoration: 'none', fontWeight: 600 }}>
                View all →
              </Link>
            </div>
            {recent.length === 0 ? (
              <p style={{ fontSize: 13, color: '#3a5a6e', fontStyle: 'italic' }}>No outcomes yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recent.map(o => (
                  <div
                    key={o.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', background: '#040e17',
                      border: '1px solid rgba(45,212,191,0.06)',
                      borderRadius: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: SIGNAL_COLORS[o.signalStatus as SignalStatus],
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1, fontSize: 13, fontWeight: 600, color: '#e8f4f8',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {o.title}
                    </span>
                    <span
                      style={{
                        fontSize: 9, fontWeight: 700,
                        background: STAGE_COLORS[o.stage as Stage] + '22',
                        color: STAGE_COLORS[o.stage as Stage],
                        border: `1px solid ${STAGE_COLORS[o.stage as Stage]}44`,
                        borderRadius: 4, padding: '2px 6px',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        flexShrink: 0,
                      }}
                    >
                      {o.stage}
                    </span>
                    <span style={{ fontSize: 11, color: '#3a5a6e', flexShrink: 0 }}>{timeAgo(o.updatedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions (client component) */}
        <DashboardActions />

        {/* Team snapshot */}
        {showMembers && project.projectMembers.length > 0 && (
          <div
            style={{
              background: '#061c2e',
              border: '1px solid rgba(45,212,191,0.1)',
              borderRadius: 12,
              padding: '20px 22px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Team — {project.projectMembers.length} member{project.projectMembers.length !== 1 ? 's' : ''}
              </h3>
              <Link href={`/p/${projectId}/members`} style={{ fontSize: 11, color: '#2dd4bf', textDecoration: 'none', fontWeight: 600 }}>
                Manage →
              </Link>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {project.projectMembers.map(pm => {
                const roleColor = pm.role === 'OUTCOME_OWNER' ? '#2dd4bf' : pm.role === 'CONTRIBUTOR' ? '#f59e0b' : '#6b8fa8'
                return (
                  <div
                    key={pm.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', background: '#040e17',
                      border: '1px solid rgba(45,212,191,0.08)', borderRadius: 10,
                    }}
                  >
                    {pm.member.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pm.member.avatarUrl} alt={pm.member.name}
                        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(45,212,191,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#2dd4bf', flexShrink: 0 }}>
                        {pm.member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f4f8' }}>{pm.member.name}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: roleColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {pm.role.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          70% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  )
}
