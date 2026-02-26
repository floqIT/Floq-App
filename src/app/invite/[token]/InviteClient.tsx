'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type InviteData = {
  projectId: string
  projectName: string
  projectColor: string
  role: 'OUTCOME_OWNER' | 'CONTRIBUTOR' | 'VIEWER'
  email: string
  inviterName: string
  expiresAt: string
  expired: boolean
  alreadyAccepted: boolean
}

const ROLE_DESCRIPTIONS: Record<InviteData['role'], string> = {
  OUTCOME_OWNER: 'Full project control. Can manage members, archive project, and own any outcome.',
  CONTRIBUTOR: 'Create outcomes, move stages, log signals. Cannot manage members.',
  VIEWER: 'Read-only access. Cannot make changes.',
}

const ROLE_COLORS: Record<InviteData['role'], { bg: string; text: string; border: string }> = {
  OUTCOME_OWNER: { bg: 'rgba(45,212,191,0.15)', text: '#2dd4bf', border: 'rgba(45,212,191,0.4)' },
  CONTRIBUTOR: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.4)' },
  VIEWER: { bg: 'rgba(107,143,168,0.12)', text: '#6b8fa8', border: 'rgba(107,143,168,0.3)' },
}

function timeUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `in ${days} day${days !== 1 ? 's' : ''}`
  if (hours > 0) return `in ${hours} hour${hours !== 1 ? 's' : ''}`
  return 'very soon'
}

interface Props {
  token: string
  invite: InviteData | null
  error: 'not_found' | 'expired' | null
  isLoggedIn: boolean
}

export default function InviteClient({ token, invite, error, isLoggedIn }: Props) {
  const router = useRouter()
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState('')

  async function handleAccept() {
    if (!isLoggedIn) {
      router.push(`/sign-in?redirect_url=/invite/${token}`)
      return
    }
    setAccepting(true)
    setAcceptError('')
    try {
      const res = await fetch(`/api/invites/${token}/accept`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        router.push(`/p/${data.projectId}/dashboard`)
      } else {
        setAcceptError(data.error === 'expired' ? 'This invite has expired.' :
          data.error === 'already_accepted' ? 'This invite has already been used.' :
          'Something went wrong. Please try again.')
      }
    } catch {
      setAcceptError('Network error. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#040e17',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '24px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: '#2dd4bf', letterSpacing: '-0.03em', marginBottom: 4 }}>
          FLOQ
        </div>
        <div style={{ fontSize: 12, color: '#3a5a6e', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Flow · Launch · Observe · Quantify
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: '#061c2e',
        border: '1px solid rgba(45,212,191,0.2)',
        borderRadius: 16,
        padding: '40px',
        maxWidth: 480,
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>

        {/* Error states */}
        {(error === 'not_found' || (invite?.alreadyAccepted && !error)) && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e8f4f8', marginBottom: 8 }}>
              Invalid or already used invite link
            </h2>
            <p style={{ fontSize: 14, color: '#6b8fa8', lineHeight: 1.6 }}>
              This invite link is no longer valid. Ask the project owner for a new invite link.
            </p>
          </div>
        )}

        {error === 'expired' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e8f4f8', marginBottom: 8 }}>
              This invite has expired
            </h2>
            <p style={{ fontSize: 14, color: '#6b8fa8', lineHeight: 1.6 }}>
              Ask the project owner for a new invite link.
            </p>
          </div>
        )}

        {!error && invite && !invite.alreadyAccepted && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <p style={{ fontSize: 14, color: '#6b8fa8', marginBottom: 20 }}>You&apos;ve been invited to join</p>

              {/* Project name */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: invite.projectColor,
                  boxShadow: `0 0 8px ${invite.projectColor}80`,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 22, fontWeight: 800, color: '#e8f4f8' }}>{invite.projectName}</span>
              </div>

              {/* Role badge */}
              {(() => {
                const c = ROLE_COLORS[invite.role]
                return (
                  <div style={{ marginBottom: 16 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
                      borderRadius: 20, padding: '5px 14px',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                      {invite.role.replace('_', ' ')}
                    </span>
                  </div>
                )
              })()}

              {/* Role description */}
              <p style={{ fontSize: 13, color: '#6b8fa8', lineHeight: 1.6, marginBottom: 20 }}>
                {ROLE_DESCRIPTIONS[invite.role]}
              </p>

              {/* Meta */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 12, color: '#3a5a6e' }}>
                <span>Invited by <strong style={{ color: '#a8ccd8' }}>{invite.inviterName}</strong></span>
                <span>·</span>
                <span>Expires <strong style={{ color: '#a8ccd8' }}>{timeUntil(invite.expiresAt)}</strong></span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(45,212,191,0.08)', marginBottom: 24 }} />

            {/* Accept button */}
            {acceptError && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#ef4444', textAlign: 'center' }}>
                {acceptError}
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={accepting}
              style={{
                width: '100%',
                padding: '14px',
                background: accepting ? 'rgba(45,212,191,0.08)' : 'rgba(45,212,191,0.15)',
                color: '#2dd4bf',
                border: '1px solid rgba(45,212,191,0.4)',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: accepting ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!accepting) { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(45,212,191,0.25)'; b.style.borderColor = 'rgba(45,212,191,0.6)' } }}
              onMouseLeave={e => { if (!accepting) { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(45,212,191,0.15)'; b.style.borderColor = 'rgba(45,212,191,0.4)' } }}
            >
              {accepting ? 'Accepting…' : 'Accept Invitation'}
            </button>

            {!isLoggedIn && (
              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#3a5a6e' }}>
                Already have an account?{' '}
                <a
                  href={`/sign-in?redirect_url=/invite/${token}`}
                  style={{ color: '#2dd4bf', textDecoration: 'none', fontWeight: 600 }}
                >
                  Sign in first
                </a>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
