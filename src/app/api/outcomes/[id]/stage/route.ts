import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { Stage } from '@prisma/client'

const PatchStageSchema = z.object({
  stage: z.enum(['IDEATE','IDENTIFY','SHAPE','BUILD','QA','SHIP','MEASURE','DELIVER','PIVOT']),
  note: z.string().max(500).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const parsed = PatchStageSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const outcome = await prisma.outcome.findUnique({ where: { id } })
    if (!outcome) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const member = await prisma.member.findFirst({ where: { clerkUserId: userId, workspaceId: outcome.workspaceId } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const updated = await prisma.outcome.update({
      where: { id },
      data: {
        stage: parsed.data.stage as Stage,
        stageChangedAt: new Date(),
        deliveredAt: parsed.data.stage === 'DELIVER' ? new Date() : undefined,
        stageHistory: {
          create: {
            fromStage: outcome.stage as Stage,
            toStage: parsed.data.stage as Stage,
            note: parsed.data.note,
            changedById: member.id,
          },
        },
      },
      include: {
        current: true,
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        qaAssignee: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { signals: true, comments: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('[outcomes PATCH stage]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
