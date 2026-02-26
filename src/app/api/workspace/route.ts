import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const workspaceId = req.nextUrl.searchParams.get('workspaceId')
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

    const member = await prisma.member.findFirst({ where: { clerkUserId: userId, workspaceId } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(workspace)
  } catch (e) {
    console.error('[workspace GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = UpdateWorkspaceSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const workspaceId = req.nextUrl.searchParams.get('workspaceId')
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

    const member = await prisma.member.findFirst({
      where: { clerkUserId: userId, workspaceId },
    })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (member.role !== 'OUTCOME_OWNER' && member.role !== 'FLOQ_LEAD') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name: parsed.data.name },
    })
    return NextResponse.json(workspace)
  } catch (e) {
    console.error('[workspace PATCH]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
