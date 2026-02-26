import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-5xl font-black tracking-tighter">
          FL<span className="text-primary">OQ</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Post-Agile project management for AI-augmented teams.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/board"
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Open Board →
          </Link>
          <a
            href="https://floqit.com"
            target="_blank"
            className="border border-border px-6 py-2.5 rounded-lg font-medium text-muted-foreground hover:text-foreground transition"
          >
            Framework Docs
          </a>
        </div>
      </div>
    </main>
  )
}
