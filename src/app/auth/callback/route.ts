import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Auth is disabled — redirect all auth callbacks to home
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/home`)
}
