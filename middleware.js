import { NextResponse } from 'next/server'

export function middleware(request) {
  // Get the pathname of the request (e.g. /api/chat, /api/generate-newsletter)
  const pathname = request.nextUrl.pathname

  // Only apply CORS to API routes
  if (pathname.startsWith('/api/')) {
    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, X-CSRF-Token',
          'Access-Control-Max-Age': '86400', // 24 hours
        },
      })
    }

    // For actual requests, add CORS headers
    const response = NextResponse.next()

    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, X-CSRF-Token')

    return response
  }

  // For non-API routes, just continue
  return NextResponse.next()
}

// Configure which routes the middleware runs on
export const config = {
  matcher: '/api/:path*',
}
