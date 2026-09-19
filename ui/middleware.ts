import { resolveRoleRedirectPath } from "@enterprise/core/services/auth-service";
import { createBackendAdapters } from "@enterprise/core/services/backend-adapters";
import { createMiddlewareClient } from "@enterprise/core/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/login",
  "/reset-password",
  "/auth/callback",
];
const AUTH_COMPLETION_ROUTES = ["/auth/callback", "/reset-password"];

const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const middlewareSupabaseConfig = {
  supabaseUrl,
  supabaseAnonKey,
};

// Session refresh is provider-agnostic via SessionPort.
const { session: sessionPort } = createBackendAdapters();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isServerActionRequest = request.method === "POST" && request.headers.has("next-action");

  // Session refresh is handled by SessionPort — no direct @supabase/ssr import needed.
  const response = await sessionPort.refreshSession(request);

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isAuthCompletionRoute = AUTH_COMPLETION_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  const supabase = createMiddlewareClient(request, middlewareSupabaseConfig);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicRoute && !isAuthCompletionRoute) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (!user) {
    return response;
  }

  // Every role (owner, admin, member, guest) currently resolves to the same home
  // path, so looking up this user's role cannot change the outcome. Resolving from
  // null skips a guaranteed-constant database round trip on the slowest leg of the
  // request — Edge middleware to the database region — for every authenticated
  // navigation.
  //
  // The invariant is guarded by a unit test in
  // packages/core/src/services/__tests__/auth-service.test.ts. If role home paths
  // ever diverge, that test fails and this must go back to a per-user role lookup.
  const roleHome = resolveRoleRedirectPath(null);

  if (isServerActionRequest) {
    return response;
  }

  if (pathname === roleHome) {
    return response;
  }

  if (pathname === "/" || (isPublicRoute && !isAuthCompletionRoute)) {
    return NextResponse.redirect(new URL(roleHome, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
