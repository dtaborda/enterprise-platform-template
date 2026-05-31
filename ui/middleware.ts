import { createBackendAdapters } from "@enterprise/core/services/backend-adapters";
import {
  getUserRoleService,
  resolveRoleRedirectPath,
} from "@enterprise/core/services/auth-service";
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
// auth factory is request-scoped: call authFactory(supabase) per request.
const { session: sessionPort, auth: authFactory } = createBackendAdapters();

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

  // Role resolution uses SupabaseClient for the DB query via AuthPort.
  // TODO: Replace with DatabasePort when available (P1 follow-up).
  const supabase = createMiddlewareClient(request, middlewareSupabaseConfig);
  const auth = authFactory(supabase);

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

  const roleResult = await getUserRoleService(auth, user.id);
  const roleHome = roleResult.success
    ? resolveRoleRedirectPath(roleResult.data.role)
    : resolveRoleRedirectPath("guest");

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
