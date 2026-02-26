import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const CreateOutcomeSchema = z.object({
  title: z.string().min(1).max(200),
  workspaceId: z.string().cuid(),
  stage: z.enum(['IDEATE','IDENTIFY','SHAPE','BUILD','QA','SHIP','MEASURE','DELIVER','PIVOT']).default('IDEATE'),
  signalStatus: z.enum(['NORMAL','AT_RISK','EMERGENCY','DELIVERED']).default('NORMAL'),
  impactScore: z.number().int().min(1).max(5).default(3),
  isAiPair: z.boolean().default(false),
  targetMetric: z.string().max(500).optional(),
  description: z.string().optional(),
  currentId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  assigneeId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const workspaceId = req.nextUrl.searchParams.get('workspaceId')
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

    const projectId = req.nextUrl.searchParams.get('projectId')

    // Verify user is member of this workspace
    const member = await prisma.member.findFirst({ where: { clerkUserId: userId, workspaceId } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const outcomes = await prisma.outcome.findMany({
      where: {
        workspaceId,
        ...(projectId ? { projectId } : {}),
      },
      include: {
        current: true,
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        qaAssignee: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { signals: true, comments: true } },
      },
      orderBy: [{ signalStatus: 'desc' }, { impactScore: 'desc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(outcomes)
  } catch (e) {
    console.error('[outcomes GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = CreateOutcomeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { workspaceId, ...data } = parsed.data

    const member = await prisma.member.findFirst({ where: { clerkUserId: userId, workspaceId } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const outcome = await prisma.outcome.create({
      data: {
        ...data,
        workspaceId,
        createdById: member.id,
        stageHistory: { create: { toStage: data.stage ?? 'IDEATE' } },
      },
      include: {
        current: true,
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        qaAssignee: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { signals: true, comments: true } },
      },
    })

    return NextResponse.json(outcome, { status: 201 })
  } catch (e) {
    console.error('[outcomes POST]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
