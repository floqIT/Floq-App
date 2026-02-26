import type { Metadata } from 'next'
import { Sora, Inter, JetBrains_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const sora = Sora({ variable: '--font-sora', subsets: ['latin'], weight: ['300','400','500','600','700','800'] })
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const mono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FLOQ Board',
  description: 'Outcome Flow Board — post-Agile framework',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${sora.variable} ${inter.variable} ${mono.variable}`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
