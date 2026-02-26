import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const currents = await prisma.current.findMany({
    where: { workspaceId },
    include: { _count: { select: { outcomes: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(currents)
}

export async function POST(req: NextRequest) {
  const { name, color, workspaceId } = await req.json()

  const current = await prisma.current.create({
    data: { name, color: color ?? '#2dd4bf', workspaceId },
  })

  return NextResponse.json(current, { status: 201 })
}
