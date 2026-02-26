import { Suspense } from 'react'

export const metadata = { title: 'FLOQ Board' }

export default function BoardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-muted-foreground">
          Loading board...
        </div>
      }
    >
      <div className="flex flex-col h-screen bg-background">
        <header className="h-14 border-b flex items-center px-6 gap-4 shrink-0">
          <h1 className="font-bold text-lg tracking-tight">FLOQ Board</h1>
          <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
            Live
          </span>
        </header>
        <main className="flex-1 overflow-hidden p-6">
          <p className="text-muted-foreground text-sm">Board connected — outcomes will appear here.</p>
        </main>
      </div>
    </Suspense>
  )
}
