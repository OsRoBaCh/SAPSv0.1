import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Terminate any lingering active sessions by clearing cookies
  const cookiesToClear = [
    'sb-asonxjbdpklobnnnlpuj-auth-token',
    'saps_session',
    'supabase-auth-token'
  ];

  cookiesToClear.forEach(cookie => {
    response.cookies.set(cookie, '', { expires: new Date(0) });
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
