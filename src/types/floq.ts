export type SignalStatus = 'NORMAL' | 'AT_RISK' | 'EMERGENCY' | 'DELIVERED'
export type Stage = 'IDEATE' | 'IDENTIFY' | 'SHAPE' | 'BUILD' | 'QA' | 'SHIP' | 'MEASURE' | 'DELIVER' | 'PIVOT'
export type Role = 'OUTCOME_OWNER' | 'FLOQ_LEAD' | 'BUILDER' | 'SIGNAL_ANALYST' | 'VIEWER'

export interface Outcome {
  id: string
  title: string
  stage: Stage
  signalStatus: SignalStatus
  impactScore: number
  isAiPair: boolean
  targetMetric?: string | null
  currentMetric?: string | null
  pivotWindowDays?: number
  workspaceId: string
  currentId?: string | null
  assigneeId?: string | null
  qaAssigneeId?: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  stageChangedAt: string
  deliveredAt?: string | null
  current?: { id: string; name: string; color: string } | null
  assignee?: { id: string; name: string; avatarUrl?: string | null } | null
  qaAssignee?: { id: string; name: string; avatarUrl?: string | null } | null
  _count?: { signals: number; comments: number }
}

export interface Workspace {
  id: string
  name: string
  organizationId: string
}

export interface Member {
  id: string
  clerkUserId: string
  email: string
  name: string
  role: Role
  workspaceId: string
}

export const STAGES: Stage[] = ['IDEATE', 'IDENTIFY', 'SHAPE', 'BUILD', 'QA', 'SHIP', 'MEASURE', 'DELIVER', 'PIVOT']

export const STAGE_COLORS: Record<Stage, string> = {
  IDEATE: '#6366f1',
  IDENTIFY: '#8b5cf6',
  SHAPE: '#ec4899',
  BUILD: '#f59e0b',
  QA: '#06b6d4',
  SHIP: '#10b981',
  MEASURE: '#3b82f6',
  DELIVER: '#2dd4bf',
  PIVOT: '#ef4444',
}

export const SIGNAL_COLORS: Record<SignalStatus, string> = {
  NORMAL: '#22c55e',
  AT_RISK: '#f59e0b',
  EMERGENCY: '#ef4444',
  DELIVERED: '#2dd4bf',
}

export const NEXT_STAGE: Partial<Record<Stage, Stage>> = {
  IDEATE: 'IDENTIFY',
  IDENTIFY: 'SHAPE',
  SHAPE: 'BUILD',
  BUILD: 'QA',
  QA: 'SHIP',
  SHIP: 'MEASURE',
  MEASURE: 'DELIVER',
  // PIVOT has no automatic next (it's a decision point)
  // DELIVER has no next (end state)
}
