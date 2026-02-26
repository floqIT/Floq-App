export default function BoardLoading() {
  const cols = Array.from({ length: 8 })
  const cards = Array.from({ length: 3 })
  return (
    <div style={{ height: '100vh', background: '#040e17', display: 'flex', flexDirection: 'column' }}>
      {/* Header skeleton */}
      <div style={{ height: 52, background: '#061c2e', borderBottom: '1px solid rgba(45,212,191,0.12)', display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: '1rem' }}>
        <div style={{ width: 80, height: 20, background: 'rgba(45,212,191,0.12)', borderRadius: 4 }} />
        <div style={{ flex: 1 }} />
        <div style={{ width: 120, height: 30, borderRadius: 6, background: 'rgba(45,212,191,0.08)' }} />
      </div>
      {/* Columns skeleton */}
      <div style={{ display: 'flex', flex: 1, gap: '1rem', padding: '1rem', overflowX: 'auto' }}>
        {cols.map((_, i) => (
          <div key={i} style={{ minWidth: 240, background: '#061420', borderRadius: 12, padding: '1rem', border: '1px solid rgba(45,212,191,0.08)', flexShrink: 0 }}>
            <div style={{ height: 20, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: '1rem', animation: 'pulse 1.5s infinite' }} />
            {cards.map((_, j) => (
              <div key={j} style={{ height: 80, background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: '0.75rem', animation: 'pulse 1.5s infinite', animationDelay: `${j * 0.1}s` }} />
            ))}
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}
