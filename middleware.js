import { NextResponse } from 'next/server'

export async function middleware(request) {
  // Simple middleware that handles Supabase auth cookies
  // The AuthProvider handles all the authentication logic
  const response = NextResponse.next()
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}