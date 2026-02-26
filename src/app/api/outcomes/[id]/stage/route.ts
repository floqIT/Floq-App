import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Stage } from '@prisma/client'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { stage, note } = await req.json()

  const outcome = await prisma.outcome.update({
    where: { id: params.id },
    data: {
      stage: stage as Stage,
      stageChangedAt: new Date(),
      deliveredAt: stage === 'DELIVER' ? new Date() : undefined,
      stageHistory: {
        create: { toStage: stage as Stage, note },
      },
    },
  })

  return NextResponse.json(outcome)
}
