import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const outcomes = await prisma.outcome.findMany({
    where: { workspaceId },
    include: {
      current: true,
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { signals: true, comments: true } },
    },
    orderBy: [{ signalStatus: 'desc' }, { impactScore: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(outcomes)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, targetMetric, impactScore, stage, workspaceId, currentId, isAiPair, createdById } = body

  const outcome = await prisma.outcome.create({
    data: {
      title,
      targetMetric,
      impactScore: impactScore ?? 3,
      stage: stage ?? 'IDEATE',
      workspaceId,
      currentId,
      isAiPair: isAiPair ?? false,
      createdById,
      stageHistory: {
        create: { toStage: stage ?? 'IDEATE' },
      },
    },
    include: { current: true, assignee: true },
  })

  return NextResponse.json(outcome, { status: 201 })
}
