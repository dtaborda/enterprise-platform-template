import {
  getUserRoleService,
  resolveRoleRedirectPath,
} from "@enterprise/core/services/auth-service";
import { createMiddlewareClient, updateSession } from "@enterprise/core/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/login",
  "/reset-password",
  "/auth/callback",
];
const AUTH_COMPLETION_ROUTES = ["/auth/callback", "/reset-password"];
const PROTECTED_ROUTES = ["/dashboard"];

const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const middlewareSupabaseConfig = {
  supabaseUrl,
  supabaseAnonKey,
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isServerActionRequest = request.method === "POST" && request.headers.has("next-action");
  const response = await updateSession(request, middlewareSupabaseConfig);

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isAuthCompletionRoute = AUTH_COMPLETION_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  const supabase = createMiddlewareClient(request, middlewareSupabaseConfig);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedRoute) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (!user) {
    return response;
  }

  const roleResult = await getUserRoleService(supabase, user.id);
  const roleHome = roleResult.success
    ? resolveRoleRedirectPath(roleResult.data.role)
    : resolveRoleRedirectPath("guest");

  if (isServerActionRequest) {
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
