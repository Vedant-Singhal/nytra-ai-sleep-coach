import { NextResponse, type NextRequest } from 'next/server'

// Auth disabled for demo — all routes are public
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons).*)'],
}
