import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const AddMemberSchema = z.object({
  memberId: z.string(),
  role: z.enum(['OUTCOME_OWNER', 'CONTRIBUTOR', 'VIEWER']).default('CONTRIBUTOR'),
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const member = await prisma.member.findFirst({
      where: { clerkUserId: userId, workspaceId: project.workspaceId },
    })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: {
        member: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(members)
  } catch (e) {
    console.error('[projects/members GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { ok } = await checkProjectAdmin(userId, id)
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const parsed = AddMemberSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const pm = await prisma.projectMember.upsert({
      where: { projectId_memberId: { projectId: id, memberId: parsed.data.memberId } },
      create: { projectId: id, memberId: parsed.data.memberId, role: parsed.data.role },
      update: { role: parsed.data.role },
      include: {
        member: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
      },
    })

    return NextResponse.json(pm, { status: 201 })
  } catch (e) {
    console.error('[projects/members POST]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
