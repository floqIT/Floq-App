'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040e17', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ color: '#ef4444', fontFamily: 'var(--font-sora)', fontSize: '1.5rem' }}>Something went wrong</h2>
      <p style={{ color: '#a8ccd8', fontSize: '0.875rem' }}>{error.message}</p>
      <button
        onClick={reset}
        style={{ padding: '0.5rem 1.5rem', background: '#2dd4bf', color: '#040e17', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 600 }}
      >
        Try again
      </button>
    </div>
  )
}
