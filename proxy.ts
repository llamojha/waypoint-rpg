import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

type CookieToSet = {
  name: string;
  value: string;
  options?: Partial<ResponseCookie>;
};

/**
 * Protected route patterns that require authentication
 * Requirements: 4.3, 4.4
 */
const PROTECTED_ROUTES = [
  "/api/character",
  "/api/turn",
  "/api/world",
  "/api/quests",
];

/**
 * Protected view patterns (query params that indicate protected views)
 * Requirements: 4.4
 */
const PROTECTED_VIEWS = ["game", "profile", "map", "codex"];

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  "/api/auth/callback",
  "/api/news", // World news is public for discovery
];

/**
 * Check if a path matches any of the protected route patterns
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if a path is explicitly public
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if the request is for a protected view
 */
function isProtectedView(searchParams: URLSearchParams): boolean {
  const view = searchParams.get("view");
  return view !== null && PROTECTED_VIEWS.includes(view);
}

/**
 * Creates a Supabase client configured for proxy context
 */
function createProxySupabaseClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }: CookieToSet) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  return { supabase, response };
}

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, allow request to proceed
  // This prevents blocking during development without env vars
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase environment variables not configured");
    return NextResponse.next();
  }

  const { supabase, response: supabaseResponse } =
    createProxySupabaseClient(request);

  // Refresh session tokens on each request (Requirement 3.3)
  // IMPORTANT: Do not remove this getUser() call - it refreshes the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, searchParams } = request.nextUrl;

  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  // Check if this is a protected API route (Requirements 4.1, 4.2, 4.3)
  if (isProtectedRoute(pathname)) {
    if (!user) {
      // Return 401 for API routes when not authenticated
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    // User is authenticated, allow the request
    return supabaseResponse;
  }

  // Check if this is a protected view (Requirement 4.4)
  if (isProtectedView(searchParams)) {
    if (!user) {
      // Redirect to landing page for protected views when not authenticated
      const url = request.nextUrl.clone();
      url.searchParams.delete("view");
      url.searchParams.set(
        "error",
        encodeURIComponent("Please sign in to access this page.")
      );
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
