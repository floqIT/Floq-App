import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
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
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(45,212,191,0.05) 0%, transparent 70%)',
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

        <h2 style={{
          fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 800, lineHeight: 1.2,
          color: '#e8f4f8', marginBottom: '1rem',
          fontFamily: 'var(--font-sora, Sora, system-ui)',
        }}>
          Replace Jira with<br />
          <span style={{ color: '#2dd4bf' }}>something that flows.</span>
        </h2>
        <p style={{ fontSize: '1rem', color: '#a8ccd8', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: 420 }}>
          Start your first project in minutes. No setup fees. No sprint planning. Just outcomes flowing from idea to delivery.
        </p>

        {/* Social proof / stats */}
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2.5rem' }}>
          {[
            { value: '0', label: 'Ceremonies required' },
            { value: '8', label: 'Flow stages' },
            { value: '5', label: 'FLOQ roles' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2dd4bf', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b8fa8', marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonial-style quote */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'rgba(45,212,191,0.05)',
          border: '1px solid rgba(45,212,191,0.15)',
          borderRadius: '0.75rem',
          borderLeft: '3px solid #2dd4bf',
          maxWidth: 420,
        }}>
          <p style={{ fontSize: '0.9rem', color: '#a8ccd8', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>
            &ldquo;FLOQ removes the ceremony and keeps the clarity. Every outcome has a signal, a stage, and a decision path.&rdquo;
          </p>
          <p style={{ fontSize: '0.8rem', color: '#2dd4bf', marginTop: '0.75rem', fontWeight: 600 }}>
            — Ashok Kumar Kata, Creator of FLOQ
          </p>
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
        <SignUp
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
            },
          }}
        />
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="flex: 1"] { display: none !important; }
          div[style*="width: 480px"] { width: 100% !important; padding: 2rem 1.5rem !important; }
        }
      `}</style>
    </div>
  )
}
