import { getServerClient } from "@enterprise/core/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { normalizeSafeRedirectPath } from "@/features/auth/redirects";

const EMAIL_OTP_TYPE = {
  SIGNUP: "signup",
  RECOVERY: "recovery",
  INVITE: "invite",
  EMAIL: "email",
  EMAIL_CHANGE: "email_change",
} as const;

type EmailOtpType = (typeof EMAIL_OTP_TYPE)[keyof typeof EMAIL_OTP_TYPE];

const SUPPORTED_EMAIL_OTP_TYPES = new Set<EmailOtpType>(Object.values(EMAIL_OTP_TYPE));

function isEmailOtpType(value: string): value is EmailOtpType {
  return SUPPORTED_EMAIL_OTP_TYPES.has(value as EmailOtpType);
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = request.nextUrl.searchParams.get("next");
  const fallbackPath = type === EMAIL_OTP_TYPE.RECOVERY ? "/reset-password" : "/dashboard";
  const successPath = normalizeSafeRedirectPath(next, fallbackPath);

  if (!tokenHash || !type || !isEmailOtpType(type)) {
    return NextResponse.redirect(new URL("/sign-in?error=invalidCallback", request.url));
  }

  const supabase = await getServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(new URL("/sign-in?error=callbackFailed", request.url));
  }

  return NextResponse.redirect(new URL(successPath, request.url));
}
