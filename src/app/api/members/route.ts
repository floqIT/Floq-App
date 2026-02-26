import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const workspaceId = req.nextUrl.searchParams.get('workspaceId')
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

    const member = await prisma.member.findFirst({ where: { clerkUserId: userId, workspaceId } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const members = await prisma.member.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(members)
  } catch (e) {
    console.error('[members GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
