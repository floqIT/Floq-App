import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const window = await prisma.focusWindow.findUnique({ where: { id } })
    if (!window) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const member = await prisma.member.findFirst({
      where: { clerkUserId: userId, workspaceId: window.workspaceId },
    })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const focusOutcomes = await prisma.focusOutcome.findMany({
      where: { focusWindowId: id },
      include: {
        outcome: {
          include: {
            project: { select: { id: true, name: true, color: true } },
            _count: { select: { signals: true, comments: true } },
          },
        },
      },
    })

    return NextResponse.json(focusOutcomes.map(fo => fo.outcome))
  } catch (e) {
    console.error('[windows/outcomes GET]', e)
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
    const { outcomeId } = await req.json()
    if (!outcomeId) return NextResponse.json({ error: 'outcomeId required' }, { status: 400 })

    const window = await prisma.focusWindow.findUnique({ where: { id } })
    if (!window) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const member = await prisma.member.findFirst({
      where: { clerkUserId: userId, workspaceId: window.workspaceId },
    })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const fo = await prisma.focusOutcome.upsert({
      where: { focusWindowId_outcomeId: { focusWindowId: id, outcomeId } },
      create: { focusWindowId: id, outcomeId },
      update: {},
    })

    return NextResponse.json(fo, { status: 201 })
  } catch (e) {
    console.error('[windows/outcomes POST]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const outcomeId = req.nextUrl.searchParams.get('outcomeId')
    if (!outcomeId) return NextResponse.json({ error: 'outcomeId required' }, { status: 400 })

    const window = await prisma.focusWindow.findUnique({ where: { id } })
    if (!window) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const member = await prisma.member.findFirst({
      where: { clerkUserId: userId, workspaceId: window.workspaceId },
    })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.focusOutcome.deleteMany({
      where: { focusWindowId: id, outcomeId },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[windows/outcomes DELETE]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
