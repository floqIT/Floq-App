import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const UpdateOutcomeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  signalStatus: z.enum(['NORMAL', 'AT_RISK', 'EMERGENCY', 'DELIVERED']).optional(),
  stage: z.enum(['IDEATE','IDENTIFY','SHAPE','BUILD','QA','SHIP','MEASURE','DELIVER','PIVOT']).optional(),
  impactScore: z.number().int().min(1).max(5).optional(),
  isAiPair: z.boolean().optional(),
  targetMetric: z.string().max(500).nullable().optional(),
  currentMetric: z.string().max(500).nullable().optional(),
  description: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  qaAssigneeId: z.string().cuid().nullable().optional(),
})

async function getMemberForOutcome(userId: string, outcomeId: string) {
  const outcome = await prisma.outcome.findUnique({ where: { id: outcomeId } })
  if (!outcome) return { outcome: null, member: null }
  const member = await prisma.member.findFirst({
    where: { clerkUserId: userId, workspaceId: outcome.workspaceId },
  })
  return { outcome, member }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const parsed = UpdateOutcomeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { outcome, member } = await getMemberForOutcome(userId, id)
    if (!outcome) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { stage: newStage, ...otherData } = parsed.data

    const updated = await prisma.$transaction(async (tx) => {
      const stageData = newStage ? {
        stage: newStage,
        stageChangedAt: new Date(),
        ...(newStage === 'DELIVER' ? { deliveredAt: new Date() } : {}),
      } : {}

      const upd = await tx.outcome.update({
        where: { id },
        data: { ...otherData, ...stageData },
        include: {
          current: true,
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          qaAssignee: { select: { id: true, name: true, avatarUrl: true } },
          project: { select: { id: true, name: true, color: true } },
          codeLinks: { orderBy: { createdAt: 'asc' } },
          _count: { select: { signals: true, comments: true } },
        },
      })

      if (newStage && outcome.stage !== newStage) {
        await tx.stageHistory.create({
          data: { outcomeId: id, fromStage: outcome.stage, toStage: newStage, changedById: member.id },
        })
      }

      return upd
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('[outcomes PATCH]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { outcome, member } = await getMemberForOutcome(userId, id)
    if (!outcome) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.outcome.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[outcomes DELETE]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
