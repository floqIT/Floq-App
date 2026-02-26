import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/invites/[token]/accept — Auth required
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { token } = await params

    const invite = await prisma.projectInvite.findUnique({
      where: { token },
      include: {
        project: { select: { id: true, workspaceId: true, name: true } },
      },
    })

    if (!invite) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const now = new Date()
    if (invite.expiresAt < now) return NextResponse.json({ error: 'expired' }, { status: 410 })
    if (invite.acceptedAt) return NextResponse.json({ error: 'already_accepted' }, { status: 409 })

    const { workspaceId } = invite.project

    // Get or create workspace Member for this Clerk user
    let member = await prisma.member.findFirst({
      where: { clerkUserId: userId, workspaceId },
    })

    if (!member) {
      // Get Clerk user info to create the member
      const clerkUser = await currentUser()
      if (!clerkUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      const name = clerkUser.firstName
        ? `${clerkUser.firstName}${clerkUser.lastName ? ' ' + clerkUser.lastName : ''}`
        : clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] ?? 'User'
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? invite.email

      // Get workspace to find organizationId
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
      if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

      member = await prisma.member.create({
        data: {
          clerkUserId: userId,
          email,
          name,
          avatarUrl: clerkUser.imageUrl ?? null,
          role: 'BUILDER',
          organizationId: workspace.organizationId,
          workspaceId,
        },
      })
    }

    // Check if already a project member
    const existingPM = await prisma.projectMember.findUnique({
      where: { projectId_memberId: { projectId: invite.projectId, memberId: member.id } },
    })

    if (existingPM) {
      // Mark as accepted and return
      await prisma.projectInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: now },
      })
      return NextResponse.json({ projectId: invite.projectId, alreadyMember: true })
    }

    // Create ProjectMember and mark invite accepted
    await prisma.$transaction([
      prisma.projectMember.create({
        data: {
          projectId: invite.projectId,
          memberId: member.id,
          role: invite.role,
        },
      }),
      prisma.projectInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: now },
      }),
    ])

    return NextResponse.json({ projectId: invite.projectId })
  } catch (e) {
    console.error('[invites/[token]/accept POST]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
