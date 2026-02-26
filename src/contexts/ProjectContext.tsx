'use client'

import { createContext, useContext } from 'react'

export type ProjectRole = 'OUTCOME_OWNER' | 'CONTRIBUTOR' | 'VIEWER'

export interface ProjectContextValue {
  projectId: string
  projectName: string
  projectColor: string
  userRole: ProjectRole
  workspaceId: string
  memberId: string
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({
  value,
  children,
}: {
  value: ProjectContextValue
  children: React.ReactNode
}) {
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used within a ProjectProvider')
  return ctx
}
