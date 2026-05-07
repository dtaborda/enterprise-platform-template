import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@enterprise/ui/components/card";
import Link from "next/link";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata = { title: "Sign In" };

interface SignInPageProps {
  searchParams?: Promise<{
    redirectTo?: string;
    registered?: string;
    passwordUpdated?: string;
    error?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your credentials to access the platform</CardDescription>
      </CardHeader>
      <CardContent>
        {params.registered ? (
          <p className="mb-4 rounded-md bg-surface-container-high px-3 py-2 text-sm text-foreground">
            Your account was created. You can sign in now.
          </p>
        ) : null}
        {params.passwordUpdated ? (
          <p className="mb-4 rounded-md bg-surface-container-high px-3 py-2 text-sm text-foreground">
            Your password was updated. Sign in with your new password.
          </p>
        ) : null}
        {params.error ? (
          <p className="mb-4 rounded-md bg-surface-container-high px-3 py-2 text-sm text-foreground">
            This auth link is invalid or expired. Request a new one.
          </p>
        ) : null}

        <SignInForm redirectTo={params.redirectTo} />

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
          <Link href="/sign-up" className="text-primary hover:underline">
            Create account
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
