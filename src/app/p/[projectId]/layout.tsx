import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import ProjectLayoutClient from '@/components/layout/ProjectLayoutClient'
import type { ProjectRole } from '@/contexts/ProjectContext'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { projectId } = await params

  // Find the workspace member for this user
  const member = await prisma.member.findFirst({ where: { clerkUserId: userId } })
  if (!member) redirect('/projects')

  // Fetch project and verify access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      projectMembers: {
        where: { memberId: member.id },
        take: 1,
      },
    },
  })

  if (!project || project.workspaceId !== member.workspaceId) {
    redirect('/projects')
  }

  // Determine role: explicit project role or fall back to CONTRIBUTOR
  const projectRole = (project.projectMembers[0]?.role ?? 'CONTRIBUTOR') as ProjectRole

  return (
    <ProjectLayoutClient
      contextValue={{
        projectId,
        projectName: project.name,
        projectColor: project.color,
        userRole: projectRole,
        workspaceId: member.workspaceId,
        memberId: member.id,
      }}
    >
      {children}
    </ProjectLayoutClient>
  )
}
