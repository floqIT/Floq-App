'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'
import { Menu, X } from 'lucide-react'
import type { ProjectRole } from '@/contexts/ProjectContext'

interface Props {
  projectId: string
  projectName: string
  projectColor: string
  userRole: ProjectRole
  collapsed: boolean
  onToggle: () => void
}

export default function ProjectSidebar({
  projectId,
  projectName,
  projectColor,
  userRole,
  collapsed,
  onToggle,
}: Props) {
  const pathname = usePathname()
  const { user } = useUser()

  const base = `/p/${projectId}`

  const nav = [
    { href: `${base}/dashboard`, label: 'Dashboard',      emoji: '📊' },
    { href: `${base}/board`,     label: 'Board',           emoji: '🎯' },
    { href: `${base}/outcomes`,  label: 'Outcomes',        emoji: '📋' },
    { href: `${base}/windows`,   label: 'Focus Windows',   emoji: '🗓' },
    { href: `${base}/metrics`,   label: 'Metrics',         emoji: '📈' },
    ...(userRole !== 'VIEWER'
      ? [{ href: `${base}/members`, label: 'Members', emoji: '👥' }]
      : []),
  ]

  const sidebarWidth = collapsed ? 48 : 240

  const roleColors: Record<ProjectRole, string> = {
    OUTCOME_OWNER: '#2dd4bf',
    CONTRIBUTOR: '#f59e0b',
    VIEWER: '#6b8fa8',
  }

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: sidebarWidth,
        background: '#040e17',
        borderRight: '1px solid rgba(45,212,191,0.12)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 200,
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Top bar — back link + toggle */}
      <div
        style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          padding: collapsed ? '0 12px' : '0 14px',
          borderBottom: '1px solid rgba(45,212,191,0.08)',
          justifyContent: collapsed ? 'center' : 'space-between',
          flexShrink: 0,
          gap: 8,
        }}
      >
        {!collapsed && (
          <Link
            href="/projects"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              color: '#6b8fa8',
              textDecoration: 'none',
              padding: '4px 8px',
              borderRadius: 6,
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#2dd4bf' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#6b8fa8' }}
          >
            ← Projects
          </Link>
        )}
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b8fa8',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            flexShrink: 0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#2dd4bf' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b8fa8' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>

      {/* Project identity */}
      {!collapsed && (
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid rgba(45,212,191,0.08)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: projectColor,
                flexShrink: 0,
                boxShadow: `0 0 6px ${projectColor}88`,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: projectColor,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {projectName}
            </span>
          </div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              background: `${roleColors[userRole]}18`,
              color: roleColors[userRole],
              border: `1px solid ${roleColors[userRole]}33`,
              borderRadius: 20,
              padding: '2px 8px',
            }}
          >
            {userRole.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: '10px 0',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {nav.map(({ href, label, emoji }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '10px 0' : '10px 14px',
                margin: '2px 8px',
                borderRadius: 8,
                textDecoration: 'none',
                color: active ? '#2dd4bf' : '#a8ccd8',
                background: active ? 'rgba(45,212,191,0.1)' : 'transparent',
                borderLeft: active ? '3px solid #2dd4bf' : '3px solid transparent',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
                justifyContent: collapsed ? 'center' : 'flex-start',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.color = '#e8f4f8'
                  ;(e.currentTarget as HTMLAnchorElement).style.background = 'rgba(45,212,191,0.05)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.color = '#a8ccd8'
                  ;(e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                }
              }}
            >
              <span style={{ flexShrink: 0, fontSize: 14, lineHeight: 1 }}>{emoji}</span>
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}

        {/* Separator */}
        <div
          style={{
            height: 1,
            background: 'rgba(45,212,191,0.08)',
            margin: '8px 16px',
          }}
        />

        {/* Settings */}
        <Link
          href="/settings"
          title={collapsed ? 'Settings' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '10px 0' : '10px 14px',
            margin: '2px 8px',
            borderRadius: 8,
            textDecoration: 'none',
            color: pathname === '/settings' ? '#2dd4bf' : '#a8ccd8',
            background: pathname === '/settings' ? 'rgba(45,212,191,0.1)' : 'transparent',
            borderLeft: pathname === '/settings' ? '3px solid #2dd4bf' : '3px solid transparent',
            fontSize: 13,
            fontWeight: pathname === '/settings' ? 600 : 400,
            transition: 'all 0.15s',
            justifyContent: collapsed ? 'center' : 'flex-start',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span style={{ flexShrink: 0, fontSize: 14, lineHeight: 1 }}>⚙️</span>
          {!collapsed && 'Settings'}
        </Link>
      </nav>

      {/* User */}
      <div
        style={{
          borderTop: '1px solid rgba(45,212,191,0.08)',
          padding: collapsed ? '12px 0' : '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          flexShrink: 0,
        }}
      >
        <UserButton afterSignOutUrl="/sign-in" />
        {!collapsed && user && (
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#e8f4f8',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.firstName ?? user.username ?? 'User'}
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#6b8fa8',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.primaryEmailAddress?.emailAddress}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
