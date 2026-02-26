import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
])

// Old global routes that are now deprecated — redirect to /projects
const DEPRECATED_ROUTES = ['/board', '/outcomes', '/windows', '/metrics', '/members', '/dashboard']

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl

  // Redirect deprecated global routes
  for (const route of DEPRECATED_ROUTES) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return NextResponse.redirect(new URL('/projects', request.url))
    }
  }

  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
