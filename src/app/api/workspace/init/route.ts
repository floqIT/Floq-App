import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const clerkUser = await currentUser()
    if (!clerkUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Check if member already exists
    const existingMember = await prisma.member.findFirst({
      where: { clerkUserId: userId },
      include: { workspace: true, organization: true },
    })

    if (existingMember) {
      return NextResponse.json({
        workspaceId: existingMember.workspaceId,
        organizationId: existingMember.organizationId,
        memberId: existingMember.id,
      })
    }

    // First login — provision org + workspace + member
    const name = clerkUser.firstName
      ? `${clerkUser.firstName}${clerkUser.lastName ? ' ' + clerkUser.lastName : ''}`
      : clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] ?? 'User'

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
    const orgSlug = `org-${userId.slice(-8)}`

    const org = await prisma.organization.create({
      data: {
        name: `${name}'s Workspace`,
        slug: orgSlug,
      },
    })

    const workspace = await prisma.workspace.create({
      data: { name: 'My Board', organizationId: org.id },
    })

    const member = await prisma.member.create({
      data: {
        clerkUserId: userId,
        email,
        name,
        role: 'OUTCOME_OWNER',
        organizationId: org.id,
        workspaceId: workspace.id,
      },
    })

    return NextResponse.json({
      workspaceId: workspace.id,
      organizationId: org.id,
      memberId: member.id,
    })
  } catch (e) {
    console.error('[workspace/init]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
