import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import InviteClient from './InviteClient'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { userId } = await auth()

  // Fetch invite directly from DB (server-side)
  const invite = await prisma.projectInvite.findUnique({
    where: { token },
    include: {
      project: { select: { id: true, name: true, color: true } },
    },
  })

  if (!invite) {
    return (
      <InviteClient
        token={token}
        invite={null}
        error="not_found"
        isLoggedIn={!!userId}
      />
    )
  }

  const now = new Date()
  const expired = invite.expiresAt < now

  if (expired) {
    return (
      <InviteClient
        token={token}
        invite={null}
        error="expired"
        isLoggedIn={!!userId}
      />
    )
  }

  // Get inviter name
  let inviterName = 'A team member'
  if (invite.invitedById) {
    const inviter = await prisma.member.findUnique({
      where: { id: invite.invitedById },
      select: { name: true },
    })
    if (inviter) inviterName = inviter.name
  }

  return (
    <InviteClient
      token={token}
      invite={{
        projectId: invite.project.id,
        projectName: invite.project.name,
        projectColor: invite.project.color,
        role: invite.role,
        email: invite.email,
        inviterName,
        expiresAt: invite.expiresAt.toISOString(),
        expired: false,
        alreadyAccepted: invite.acceptedAt !== null,
      }}
      error={null}
      isLoggedIn={!!userId}
    />
  )
}
