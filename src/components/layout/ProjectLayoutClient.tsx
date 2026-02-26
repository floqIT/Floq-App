'use client'

import { useState } from 'react'
import { ProjectProvider, type ProjectContextValue } from '@/contexts/ProjectContext'
import ProjectSidebar from './ProjectSidebar'

interface Props {
  contextValue: ProjectContextValue
  children: React.ReactNode
}

export default function ProjectLayoutClient({ contextValue, children }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarWidth = collapsed ? 48 : 240

  return (
    <ProjectProvider value={contextValue}>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#040e17' }}>
        <ProjectSidebar
          projectId={contextValue.projectId}
          projectName={contextValue.projectName}
          projectColor={contextValue.projectColor}
          userRole={contextValue.userRole}
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        />
        <main
          style={{
            marginLeft: sidebarWidth,
            flex: 1,
            minWidth: 0,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            transition: 'margin-left 0.2s ease',
            background: '#040e17',
          }}
        >
          {children}
        </main>
      </div>
    </ProjectProvider>
  )
}
