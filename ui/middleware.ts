import type { UserRole } from "@enterprise/contracts";
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

const ROLE_REDIRECTS: Record<UserRole, string> = {
  owner: "/dashboard",
  admin: "/dashboard",
  member: "/dashboard",
  guest: "/",
};

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile?.role as UserRole | undefined) ?? "guest";
  const roleHome = ROLE_REDIRECTS[role] ?? "/dashboard";

  if (pathname === "/" || (isPublicRoute && !isAuthCompletionRoute)) {
    return NextResponse.redirect(new URL(roleHome, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
