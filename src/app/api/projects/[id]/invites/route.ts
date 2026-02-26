import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const CreateInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OUTCOME_OWNER', 'CONTRIBUTOR', 'VIEWER']).default('CONTRIBUTOR'),
})

async function getProjectMember(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return { project: null, member: null, pm: null }

  const member = await prisma.member.findFirst({
    where: { clerkUserId: userId, workspaceId: project.workspaceId },
  })
  if (!member) return { project, member: null, pm: null }

  const pm = await prisma.projectMember.findUnique({
    where: { projectId_memberId: { projectId, memberId: member.id } },
  })

  return { project, member, pm }
}

// POST /api/projects/[id]/invites — Create an invite (OUTCOME_OWNER or CONTRIBUTOR)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { project, member, pm } = await getProjectMember(userId, id)

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // OUTCOME_OWNER, CONTRIBUTOR (or workspace-level OUTCOME_OWNER/FLOQ_LEAD) can invite
    const canInvite =
      member.role === 'OUTCOME_OWNER' ||
      member.role === 'FLOQ_LEAD' ||
      pm?.role === 'OUTCOME_OWNER' ||
      pm?.role === 'CONTRIBUTOR'

    if (!canInvite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const parsed = CreateInviteSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { email, role } = parsed.data

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const invite = await prisma.projectInvite.create({
      data: {
        projectId: id,
        email,
        role,
        invitedById: member.id,
        expiresAt,
      },
    })

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://floq-app.vercel.app'}/invite/${invite.token}`

    return NextResponse.json({ ...invite, inviteUrl }, { status: 201 })
  } catch (e) {
    console.error('[projects/invites POST]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/projects/[id]/invites — List pending invites (OUTCOME_OWNER only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { project, member, pm } = await getProjectMember(userId, id)

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const canView =
      member.role === 'OUTCOME_OWNER' ||
      member.role === 'FLOQ_LEAD' ||
      pm?.role === 'OUTCOME_OWNER'

    if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const now = new Date()
    const invites = await prisma.projectInvite.findMany({
      where: {
        projectId: id,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://floq-app.vercel.app'
    const withUrls = invites.map(inv => ({
      ...inv,
      inviteUrl: `${appUrl}/invite/${inv.token}`,
    }))

    return NextResponse.json(withUrls)
  } catch (e) {
    console.error('[projects/invites GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
