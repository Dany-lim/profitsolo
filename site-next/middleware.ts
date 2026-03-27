import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip login page and login API
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  const session = request.cookies.get('admin-session');

  // Protect admin pages
  if (pathname.startsWith('/admin')) {
    if (!session || session.value !== 'authenticated') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Protect admin API routes
  if (pathname.startsWith('/api/admin') || pathname === '/api/save-post' || pathname === '/api/delete-post' || pathname === '/api/toggle-publish' || pathname === '/api/validate-content') {
    if (!session || session.value !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/save-post', '/api/delete-post', '/api/toggle-publish', '/api/validate-content'],
};
