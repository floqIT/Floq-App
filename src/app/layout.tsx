import type { Metadata } from 'next'
import { Sora, Inter, JetBrains_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const sora = Sora({ variable: '--font-sora', subsets: ['latin'], weight: ['300','400','500','600','700','800'] })
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const mono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'] })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'FLOQ — Flow. Launch. Observe. Quantify.',
  description: 'Outcome Flow Board — the post-Agile framework for outcome-driven teams.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
    >
      <html lang="en">
        <body className={`${sora.variable} ${inter.variable} ${mono.variable}`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
