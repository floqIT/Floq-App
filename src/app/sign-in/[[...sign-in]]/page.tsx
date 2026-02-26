import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#040e17',
      fontFamily: 'var(--font-inter, Inter, system-ui, sans-serif)',
    }}>
      {/* ── Left panel ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '4rem 5rem',
        background: 'linear-gradient(135deg, #040e17 0%, #061c2e 100%)',
        borderRight: '1px solid rgba(45,212,191,0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(45,212,191,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{
            fontSize: '3rem', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1,
            fontFamily: 'var(--font-sora, Sora, system-ui)',
            background: 'linear-gradient(135deg, #ffffff 0%, #67e8f9 50%, #2dd4bf 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>FLOQ</div>
          <div style={{
            marginTop: '0.4rem', fontSize: '0.78rem', fontWeight: 600,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: '#2dd4bf', opacity: 0.8,
          }}>Flow · Launch · Observe · Quantify</div>
        </div>

        {/* Headline */}
        <h2 style={{
          fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 800, lineHeight: 1.2,
          color: '#e8f4f8', marginBottom: '1rem',
          fontFamily: 'var(--font-sora, Sora, system-ui)',
        }}>
          Your team&apos;s outcomes,<br />
          <span style={{ color: '#2dd4bf' }}>finally in flow.</span> 
        </h2>
        <p style={{ fontSize: '1rem', color: '#a8ccd8', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: 420 }}>
          The post-Agile framework built for outcome-driven teams. No sprints. No ceremonies. Just clear outcomes flowing from idea to delivery.
        </p>

        {/* Stage pipeline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'IDEATE', color: '#6366f1' },
            { label: 'SHAPE', color: '#ec4899' },
            { label: 'BUILD', color: '#f59e0b' },
            { label: 'SHIP', color: '#10b981' },
            { label: 'DELIVER', color: '#2dd4bf' },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{
                padding: '4px 10px', borderRadius: 20,
                background: `${s.color}22`, border: `1px solid ${s.color}55`,
                color: s.color, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em',
              }}>{s.label}</div>
              {i < arr.length - 1 && (
                <span style={{ color: '#2a4a5a', fontSize: '0.75rem' }}>→</span>
              )}
            </div>
          ))}
        </div>

        {/* Feature bullets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { icon: '⚡', text: 'AI Pair built into every outcome' },
            { icon: '🎯', text: 'Project-scoped boards and metrics' },
            { icon: '📊', text: 'Signal health — NORMAL, AT_RISK, EMERGENCY' },
            { icon: '🔄', text: 'Built-in Pivot decisions — no dead tickets' },
          ].map(f => (
            <div key={f.icon} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1rem' }}>{f.icon}</span>
              <span style={{ fontSize: '0.875rem', color: '#a8ccd8' }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — Clerk ── */}
      <div style={{
        width: '480px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        background: '#040e17',
        flexShrink: 0,
      }}>
        <SignIn
          appearance={{
            variables: {
              colorPrimary: '#2dd4bf',
              colorBackground: '#061c2e',
              colorText: '#e8f4f8',
              colorTextSecondary: '#a8ccd8',
              colorInputBackground: '#0a2236',
              colorInputText: '#e8f4f8',
              colorNeutral: '#a8ccd8',
              colorDanger: '#ef4444',
              borderRadius: '0.625rem',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '0.9rem',
            },
            elements: {
              card: {
                background: '#061c2e',
                border: '1px solid rgba(45,212,191,0.15)',
                boxShadow: '0 0 40px rgba(0,0,0,0.4)',
              },
              headerTitle: { color: '#e8f4f8', fontWeight: 700, fontSize: '1.1rem' },
              headerSubtitle: { color: '#a8ccd8' },
              socialButtonsBlockButton: {
                background: '#0a2236',
                border: '1px solid rgba(45,212,191,0.2)',
                color: '#e8f4f8',
              },
              socialButtonsBlockButtonText: { color: '#e8f4f8', fontWeight: 500 },
              socialButtonsIconButton: {
                background: '#0a2236',
                border: '1px solid rgba(45,212,191,0.2)',
              },
              dividerLine: { background: 'rgba(45,212,191,0.15)' },
              dividerText: { color: '#6b8fa8' },
              formFieldLabel: { color: '#a8ccd8', fontWeight: 500 },
              formFieldInput: {
                background: '#0a2236',
                border: '1px solid rgba(45,212,191,0.2)',
                color: '#e8f4f8',
              },
              formButtonPrimary: {
                background: 'linear-gradient(135deg, #2dd4bf, #10b981)',
                color: '#040e17',
                fontWeight: 700,
                boxShadow: '0 4px 16px rgba(45,212,191,0.25)',
              },
              footerActionLink: { color: '#2dd4bf' },
              identityPreviewText: { color: '#e8f4f8' },
              identityPreviewEditButton: { color: '#2dd4bf' },
            },
          }}
        />
      </div>

      {/* Mobile: hide left panel below 900px */}
      <style>{`
        @media (max-width: 900px) {
          div[style*="flex: 1"] { display: none !important; }
          div[style*="width: 480px"] { width: 100% !important; padding: 2rem 1.5rem !important; }
        }
      `}</style>
    </div>
  )
}
