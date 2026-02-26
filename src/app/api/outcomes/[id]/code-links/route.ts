import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const AddCodeLinkSchema = z.object({
  type: z.enum(['PR', 'BRANCH', 'COMMIT', 'REPO', 'SNIPPET']),
  url: z.string().url().max(2000),
  label: z.string().max(200).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const outcome = await prisma.outcome.findUnique({ where: { id } })
    if (!outcome) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const member = await prisma.member.findFirst({
      where: { clerkUserId: userId, workspaceId: outcome.workspaceId },
    })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const links = await prisma.codeLink.findMany({
      where: { outcomeId: id },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(links)
  } catch (e) {
    console.error('[code-links GET]', e)
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
    const body = await req.json()
    const parsed = AddCodeLinkSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const outcome = await prisma.outcome.findUnique({ where: { id } })
    if (!outcome) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const member = await prisma.member.findFirst({
      where: { clerkUserId: userId, workspaceId: outcome.workspaceId },
    })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const link = await prisma.codeLink.create({
      data: { outcomeId: id, ...parsed.data },
    })
    return NextResponse.json(link, { status: 201 })
  } catch (e) {
    console.error('[code-links POST]', e)
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
    const linkId = req.nextUrl.searchParams.get('linkId')
    if (!linkId) return NextResponse.json({ error: 'linkId required' }, { status: 400 })

    const link = await prisma.codeLink.findUnique({ where: { id: linkId } })
    if (!link || link.outcomeId !== id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const outcome = await prisma.outcome.findUnique({ where: { id } })
    if (!outcome) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const member = await prisma.member.findFirst({
      where: { clerkUserId: userId, workspaceId: outcome.workspaceId },
    })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.codeLink.delete({ where: { id: linkId } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[code-links DELETE]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
