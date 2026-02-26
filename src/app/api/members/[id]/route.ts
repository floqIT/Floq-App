import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const UpdateMemberSchema = z.object({
  role: z.enum(['OUTCOME_OWNER', 'FLOQ_LEAD', 'BUILDER', 'SIGNAL_ANALYST', 'VIEWER']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const parsed = UpdateMemberSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const target = await prisma.member.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Requester must be admin of same workspace
    const requester = await prisma.member.findFirst({
      where: { clerkUserId: userId, workspaceId: target.workspaceId },
    })
    if (!requester) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (requester.role !== 'OUTCOME_OWNER' && requester.role !== 'FLOQ_LEAD') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const updated = await prisma.member.update({
      where: { id },
      data: { role: parsed.data.role },
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('[members PATCH]', e)
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
    const target = await prisma.member.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const requester = await prisma.member.findFirst({
      where: { clerkUserId: userId, workspaceId: target.workspaceId },
    })
    if (!requester) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (requester.role !== 'OUTCOME_OWNER' && requester.role !== 'FLOQ_LEAD') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    // Can't remove yourself
    if (target.clerkUserId === userId) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
    }

    await prisma.member.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[members DELETE]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
