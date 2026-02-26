import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040e17', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ color: '#2dd4bf', fontFamily: 'var(--font-sora)', fontSize: '2rem', fontWeight: 800 }}>404</h2>
      <p style={{ color: '#a8ccd8' }}>Page not found</p>
      <Link href="/board" style={{ color: '#2dd4bf', textDecoration: 'none', fontSize: '0.875rem' }}>
        ← Back to Board
      </Link>
    </div>
  )
}
