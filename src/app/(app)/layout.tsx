'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import {
  FolderOpen,
  Settings,
  Menu,
  X,
} from 'lucide-react'

const NAV = [
  { href: '/projects', label: 'Projects', Icon: FolderOpen },
  { href: '/settings', label: 'Settings', Icon: Settings },
]

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const { user } = useUser()

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: collapsed ? 48 : 220,
        background: '#040e17',
        borderRight: '1px solid rgba(45,212,191,0.12)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 200,
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo + toggle */}
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: collapsed ? '0 12px' : '0 16px',
          borderBottom: '1px solid rgba(45,212,191,0.08)',
          justifyContent: collapsed ? 'center' : 'space-between',
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>
              <span style={{ color: '#2dd4bf' }}>F</span>
              <span style={{ color: '#e8f4f8' }}>LOQ</span>
            </div>
            <div style={{ fontSize: 9, color: '#6b8fa8', letterSpacing: '0.05em', marginTop: 2, fontWeight: 500 }}>
              Flow. Launch. Observe. Quantify.
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          style={{
            background: 'none', border: 'none', color: '#6b8fa8',
            cursor: 'pointer', padding: 4, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, transition: 'color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#2dd4bf' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b8fa8' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: collapsed ? '10px 0' : '10px 16px',
                margin: '2px 8px', borderRadius: 8, textDecoration: 'none',
                color: active ? '#2dd4bf' : '#a8ccd8',
                background: active ? 'rgba(45,212,191,0.1)' : 'transparent',
                borderLeft: active ? '3px solid #2dd4bf' : '3px solid transparent',
                fontSize: 13, fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
                justifyContent: collapsed ? 'center' : 'flex-start',
                whiteSpace: 'nowrap', overflow: 'hidden',
              }}
              title={collapsed ? label : undefined}
            >
              <Icon size={16} style={{ flexShrink: 0, color: active ? '#2dd4bf' : '#6b8fa8' }} />
              {!collapsed && label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div
        style={{
          borderTop: '1px solid rgba(45,212,191,0.08)',
          padding: collapsed ? '12px 0' : '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          flexShrink: 0,
        }}
      >
        <UserButton afterSignOutUrl="/sign-in" />
        {!collapsed && user && (
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#e8f4f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.firstName ?? user.username ?? 'User'}
            </div>
            <div style={{ fontSize: 11, color: '#6b8fa8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.primaryEmailAddress?.emailAddress}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarWidth = collapsed ? 48 : 220

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#040e17' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main
        style={{
          marginLeft: sidebarWidth,
          flex: 1,
          minWidth: 0,
          transition: 'margin-left 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {children}
      </main>
    </div>
  )
}
