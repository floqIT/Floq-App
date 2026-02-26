import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

async function checkProjectAdmin(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return { ok: false }

  const member = await prisma.member.findFirst({
    where: { clerkUserId: userId, workspaceId: project.workspaceId },
  })
  if (!member) return { ok: false }

  const pm = await prisma.projectMember.findUnique({
    where: { projectId_memberId: { projectId, memberId: member.id } },
  })

  const ok =
    member.role === 'OUTCOME_OWNER' ||
    member.role === 'FLOQ_LEAD' ||
    pm?.role === 'OUTCOME_OWNER'

  return { ok }
}

// DELETE /api/projects/[id]/invites/[inviteId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, inviteId } = await params
    const { ok } = await checkProjectAdmin(userId, id)
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.projectInvite.delete({ where: { id: inviteId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[projects/invites/[inviteId] DELETE]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
