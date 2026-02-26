import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/invites/[token] — PUBLIC, no auth required
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invite = await prisma.projectInvite.findUnique({
      where: { token },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const now = new Date()
    const expired = invite.expiresAt < now
    const alreadyAccepted = invite.acceptedAt !== null

    // Get inviter name
    let inviterName = 'A team member'
    if (invite.invitedById) {
      const inviter = await prisma.member.findUnique({
        where: { id: invite.invitedById },
        select: { name: true },
      })
      if (inviter) inviterName = inviter.name
    }

    return NextResponse.json({
      projectId: invite.project.id,
      projectName: invite.project.name,
      projectColor: invite.project.color,
      role: invite.role,
      email: invite.email,
      inviterName,
      expiresAt: invite.expiresAt.toISOString(),
      expired,
      alreadyAccepted,
    })
  } catch (e) {
    console.error('[invites/[token] GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
