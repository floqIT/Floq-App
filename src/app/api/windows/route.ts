import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const CreateWindowSchema = z.object({
  name: z.string().min(1).max(100),
  workspaceId: z.string(),
  projectId: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isActive: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const workspaceId = req.nextUrl.searchParams.get('workspaceId')
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

    const projectId = req.nextUrl.searchParams.get('projectId')

    const member = await prisma.member.findFirst({ where: { clerkUserId: userId, workspaceId } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const windows = await prisma.focusWindow.findMany({
      where: {
        workspaceId,
        ...(projectId ? { projectId } : {}),
      },
      include: {
        focusOutcomes: {
          include: {
            outcome: {
              select: { id: true, title: true, stage: true, signalStatus: true, impactScore: true },
            },
          },
        },
        _count: { select: { focusOutcomes: true } },
      },
      orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }],
    })

    return NextResponse.json(windows)
  } catch (e) {
    console.error('[windows GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = CreateWindowSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const member = await prisma.member.findFirst({
      where: { clerkUserId: userId, workspaceId: parsed.data.workspaceId },
    })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (member.role !== 'OUTCOME_OWNER' && member.role !== 'FLOQ_LEAD') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const window = await prisma.focusWindow.create({
      data: {
        name: parsed.data.name,
        workspaceId: parsed.data.workspaceId,
        ...(parsed.data.projectId ? { projectId: parsed.data.projectId } : {}),
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        isActive: parsed.data.isActive,
      },
      include: { _count: { select: { focusOutcomes: true } } },
    })

    return NextResponse.json(window, { status: 201 })
  } catch (e) {
    console.error('[windows POST]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
