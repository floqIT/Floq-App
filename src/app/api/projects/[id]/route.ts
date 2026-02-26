import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'COMPLETED']).optional(),
})

async function getProjectAccess(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return { project: null, member: null, projectMember: null, isAdmin: false }

  const member = await prisma.member.findFirst({
    where: { clerkUserId: userId, workspaceId: project.workspaceId },
  })
  if (!member) return { project, member: null, projectMember: null, isAdmin: false }

  const projectMember = await prisma.projectMember.findUnique({
    where: { projectId_memberId: { projectId, memberId: member.id } },
  })

  const isAdmin =
    member.role === 'OUTCOME_OWNER' ||
    member.role === 'FLOQ_LEAD' ||
    projectMember?.role === 'OUTCOME_OWNER'

  return { project, member, projectMember, isAdmin }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { project, member } = await getProjectAccess(userId, id)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const full = await prisma.project.findUnique({
      where: { id },
      include: {
        outcomes: {
          include: {
            project: { select: { id: true, name: true, color: true } },
            _count: { select: { signals: true, comments: true } },
          },
          orderBy: [{ signalStatus: 'desc' }, { impactScore: 'desc' }],
        },
        currents: true,
        projectMembers: {
          include: {
            member: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
          },
        },
        _count: { select: { outcomes: true, currents: true } },
      },
    })

    return NextResponse.json(full)
  } catch (e) {
    console.error('[projects/[id] GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { project, member, isAdmin } = await getProjectAccess(userId, id)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!member || !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const parsed = UpdateProjectSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const updated = await prisma.project.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { outcomes: true, currents: true } } },
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('[projects/[id] PATCH]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { project, member } = await getProjectAccess(userId, id)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Only workspace-level admins can delete
    if (member.role !== 'OUTCOME_OWNER' && member.role !== 'FLOQ_LEAD') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    await prisma.project.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[projects/[id] DELETE]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
