import type { Role } from '@/types/floq'

export function isAdmin(role: Role | string): boolean {
  return role === 'OUTCOME_OWNER' || role === 'FLOQ_LEAD'
}

export function canWrite(role: Role | string): boolean {
  return role !== 'VIEWER'
}

export const ROLE_LABELS: Record<Role, string> = {
  OUTCOME_OWNER: 'Outcome Owner',
  FLOQ_LEAD: 'FLOQ Lead',
  BUILDER: 'Builder',
  SIGNAL_ANALYST: 'Signal Analyst',
  VIEWER: 'Viewer',
}

export const ROLE_COLORS: Record<Role, { bg: string; text: string; border: string }> = {
  OUTCOME_OWNER: { bg: 'rgba(45,212,191,0.15)', text: '#2dd4bf', border: 'rgba(45,212,191,0.4)' },
  FLOQ_LEAD: { bg: 'rgba(99,102,241,0.15)', text: '#818cf8', border: 'rgba(99,102,241,0.4)' },
  BUILDER: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.4)' },
  SIGNAL_ANALYST: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', border: 'rgba(59,130,246,0.4)' },
  VIEWER: { bg: 'rgba(107,143,168,0.12)', text: '#6b8fa8', border: 'rgba(107,143,168,0.3)' },
}
