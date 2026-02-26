import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const UpdateRoleSchema = z.object({
  role: z.enum(['OUTCOME_OWNER', 'CONTRIBUTOR', 'VIEWER']),
})

async function checkProjectAdmin(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return { project: null, ok: false }

  const member = await prisma.member.findFirst({
    where: { clerkUserId: userId, workspaceId: project.workspaceId },
  })
  if (!member) return { project, ok: false }

  const pm = await prisma.projectMember.findUnique({
    where: { projectId_memberId: { projectId, memberId: member.id } },
  })

  const ok =
    member.role === 'OUTCOME_OWNER' ||
    member.role === 'FLOQ_LEAD' ||
    pm?.role === 'OUTCOME_OWNER'

  return { project, member, ok }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, memberId } = await params
    const { ok } = await checkProjectAdmin(userId, id)
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const parsed = UpdateRoleSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const pm = await prisma.projectMember.update({
      where: { projectId_memberId: { projectId: id, memberId } },
      data: { role: parsed.data.role },
      include: {
        member: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
      },
    })

    return NextResponse.json(pm)
  } catch (e) {
    console.error('[projects/members/[memberId] PATCH]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, memberId } = await params
    const { ok } = await checkProjectAdmin(userId, id)
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.projectMember.delete({
      where: { projectId_memberId: { projectId: id, memberId } },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[projects/members/[memberId] DELETE]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
