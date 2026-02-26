import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import type { Stage, SignalStatus } from '@/types/floq'
import { STAGE_COLORS, SIGNAL_COLORS } from '@/types/floq'

export default async function ProjectMetricsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { projectId } = await params

  const member = await prisma.member.findFirst({ where: { clerkUserId: userId } })
  if (!member) redirect('/projects')

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project || project.workspaceId !== member.workspaceId) redirect('/projects')

  const outcomes = await prisma.outcome.findMany({
    where: { projectId, workspaceId: member.workspaceId },
    include: { stageHistory: { orderBy: { createdAt: 'asc' } } },
  })

  const total = outcomes.length
  const stageCounts: Record<Stage, number> = {
    IDEATE: 0, IDENTIFY: 0, SHAPE: 0, BUILD: 0, SHIP: 0, MEASURE: 0, DELIVER: 0, PIVOT: 0,
  }
  const signalCounts: Record<SignalStatus, number> = { NORMAL: 0, AT_RISK: 0, EMERGENCY: 0, DELIVERED: 0 }
  for (const o of outcomes) {
    stageCounts[o.stage as Stage]++
    signalCounts[o.signalStatus as SignalStatus]++
  }

  const delivered = outcomes.filter(o => o.deliveredAt)
  const avgCycleTime = delivered.length > 0
    ? Math.round(delivered.reduce((acc, o) => acc + (new Date(o.deliveredAt!).getTime() - new Date(o.createdAt).getTime()) / 86400000, 0) / delivered.length)
    : null

  const pivotCount = outcomes.filter(o => o.stage === 'PIVOT').length
  const pivotRate = total > 0 ? Math.round((pivotCount / total) * 100) : 0

  const top5 = [...outcomes]
    .sort((a, b) => b.impactScore - a.impactScore || b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5)

  const maxStageCount = Math.max(...Object.values(stageCounts), 1)
  const stages: Stage[] = ['IDEATE', 'IDENTIFY', 'SHAPE', 'BUILD', 'SHIP', 'MEASURE', 'DELIVER', 'PIVOT']
  const signalList: { key: SignalStatus; label: string; color: string }[] = [
    { key: 'NORMAL', label: 'Normal', color: SIGNAL_COLORS.NORMAL },
    { key: 'AT_RISK', label: 'At Risk', color: SIGNAL_COLORS.AT_RISK },
    { key: 'EMERGENCY', label: 'Emergency', color: SIGNAL_COLORS.EMERGENCY },
    { key: 'DELIVERED', label: 'Delivered', color: SIGNAL_COLORS.DELIVERED },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#040e17' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#e8f4f8', marginBottom: 2 }}>Metrics</h1>
          <p style={{ fontSize: 13, color: '#6b8fa8' }}>
            <span style={{ color: project.color, fontWeight: 600 }}>{project.name}</span> · Outcome health and delivery insights
          </p>
        </div>

        {total === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <h3 style={{ color: '#a8ccd8', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No data yet</h3>
            <p style={{ color: '#3a5a6e', fontSize: 13 }}>Create some outcomes to start seeing metrics.</p>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Total Outcomes', value: String(total), color: '#2dd4bf' },
                { label: 'Avg Cycle Time', value: avgCycleTime != null ? `${avgCycleTime}d` : '—', color: '#3b82f6', sub: delivered.length > 0 ? `${delivered.length} delivered` : 'No deliveries yet' },
                { label: 'Pivot Rate', value: `${pivotRate}%`, color: '#f59e0b', sub: `${pivotCount} pivoted` },
                { label: 'Emergency', value: String(signalCounts.EMERGENCY), color: '#ef4444' },
              ].map(card => (
                <div key={card.label} style={{ background: '#061c2e', border: `1px solid ${card.color}22`, borderRadius: 12, padding: '18px 20px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6b8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{card.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
                  {card.sub && <div style={{ fontSize: 11, color: '#3a5a6e', marginTop: 4 }}>{card.sub}</div>}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Stage Funnel */}
              <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, padding: '20px 22px' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#a8ccd8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 18 }}>Stage Funnel</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stages.map(stage => {
                    const count = stageCounts[stage]
                    const pct = (count / maxStageCount) * 100
                    return (
                      <div key={stage}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: STAGE_COLORS[stage], textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stage}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: count > 0 ? '#a8ccd8' : '#3a5a6e' }}>{count}</span>
                        </div>
                        <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: STAGE_COLORS[stage], borderRadius: 4, opacity: count > 0 ? 1 : 0.3 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Signal Health */}
              <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, padding: '20px 22px' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#a8ccd8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 18 }}>Signal Health</h3>
                <div style={{ display: 'flex', height: 20, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                  {signalList.map(s => {
                    const pct = total > 0 ? (signalCounts[s.key] / total) * 100 : 0
                    return pct > 0 ? <div key={s.key} title={`${s.label}: ${signalCounts[s.key]}`} style={{ width: `${pct}%`, background: s.color }} /> : null
                  })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {signalList.map(s => (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#a8ccd8', flex: 1 }}>{s.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: signalCounts[s.key] > 0 ? s.color : '#3a5a6e' }}>{signalCounts[s.key]}</span>
                      <span style={{ fontSize: 11, color: '#3a5a6e', minWidth: 32, textAlign: 'right' }}>{total > 0 ? Math.round((signalCounts[s.key] / total) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top 5 Impact */}
            <div style={{ background: '#061c2e', border: '1px solid rgba(45,212,191,0.1)', borderRadius: 12, padding: '20px 22px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#a8ccd8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Top 5 Highest Impact</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {top5.map((o, i) => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#040e17', border: '1px solid rgba(45,212,191,0.08)', borderRadius: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: i === 0 ? '#f59e0b' : '#3a5a6e', minWidth: 24, textAlign: 'center' }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f4f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</div>
                      <div style={{ fontSize: 11, color: STAGE_COLORS[o.stage as Stage], marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{o.stage}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[1,2,3,4,5].map(d => <span key={d} style={{ width: 8, height: 8, borderRadius: '50%', background: d <= o.impactScore ? '#2dd4bf' : 'rgba(45,212,191,0.15)' }} />)}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#2dd4bf', minWidth: 24 }}>{o.impactScore}/5</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
