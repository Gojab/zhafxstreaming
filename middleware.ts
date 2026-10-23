import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    const isAuthRoute =
      pathname.startsWith('/login') || pathname.startsWith('/register');
    const isProtectedRoute = pathname.startsWith('/dashboard');

    // Fast path: Only proceed with Supabase auth checks on protected or auth routes
    if (!isAuthRoute && !isProtectedRoute) {
      return NextResponse.next({ request });
    }

    let supabaseResponse = NextResponse.next({
      request,
    });

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://xjyzfunqiazlayivjsxj.supabase.co';

    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      'sb_publishable_l3QQ3rkxCcKEcXfhDgEweA_Ar5lEZ6K';

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          try {
            return request.cookies.getAll();
          } catch {
            return [];
          }
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          } catch {
            // Safely ignore cookie set errors in edge middleware
          }
        },
      },
    });

    // Fetch user with safe error handling
    let user = null;
    try {
      const result = await supabase.auth.getUser();
      user = result.data?.user || null;
    } catch (e) {
      console.warn('[Middleware] Supabase getUser failed, continuing:', e);
    }

    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(url);
    }

    if (user && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (error) {
    console.error('[Middleware Invocation Error Handled]:', error);
    // Never fail with 500 MIDDLEWARE_INVOCATION_FAILED - allow request to proceed cleanly
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
  ],
};
