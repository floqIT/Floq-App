import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040e17' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#2dd4bf', fontFamily: 'var(--font-sora)' }}>FLOQ</h1>
          <p style={{ color: '#a8ccd8', marginTop: '0.25rem', fontSize: '0.875rem' }}>Outcome Flow Board</p>
        </div>
        <SignIn appearance={{ variables: { colorPrimary: '#2dd4bf', colorBackground: '#061420', colorText: '#e8f4f8', colorInputBackground: '#0a1e2e', colorInputText: '#e8f4f8', borderRadius: '0.5rem' } }} />
      </div>
    </div>
  )
}
