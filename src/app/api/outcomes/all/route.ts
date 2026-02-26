import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const workspaceId = req.nextUrl.searchParams.get('workspaceId')
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

    const member = await prisma.member.findFirst({
      where: { clerkUserId: userId, workspaceId },
    })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Only admins
    if (member.role !== 'OUTCOME_OWNER' && member.role !== 'FLOQ_LEAD') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { count } = await prisma.outcome.deleteMany({ where: { workspaceId } })
    return NextResponse.json({ success: true, deleted: count })
  } catch (e) {
    console.error('[outcomes/all DELETE]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
