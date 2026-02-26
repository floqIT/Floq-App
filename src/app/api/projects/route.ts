import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#2dd4bf'),
  workspaceId: z.string(),
})

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const workspaceId = req.nextUrl.searchParams.get('workspaceId')
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

    const member = await prisma.member.findFirst({ where: { clerkUserId: userId, workspaceId } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const projects = await prisma.project.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { outcomes: true, currents: true } },
        projectMembers: {
          include: {
            member: { select: { id: true, name: true, avatarUrl: true, role: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(projects)
  } catch (e) {
    console.error('[projects GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = CreateProjectSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const member = await prisma.member.findFirst({
      where: { clerkUserId: userId, workspaceId: parsed.data.workspaceId },
    })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (member.role !== 'OUTCOME_OWNER' && member.role !== 'FLOQ_LEAD') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        color: parsed.data.color,
        workspaceId: parsed.data.workspaceId,
        // Auto-add creator as OUTCOME_OWNER
        projectMembers: {
          create: { memberId: member.id, role: 'OUTCOME_OWNER' },
        },
      },
      include: {
        _count: { select: { outcomes: true, currents: true } },
        projectMembers: {
          include: {
            member: { select: { id: true, name: true, avatarUrl: true, role: true } },
          },
        },
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (e) {
    console.error('[projects POST]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
