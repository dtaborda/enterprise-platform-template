import { Button } from "@enterprise/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@enterprise/ui/components/card";
import { Input } from "@enterprise/ui/components/input";
import { Label } from "@enterprise/ui/components/label";
import { signInAction } from "@/features/auth/actions";
import Link from "next/link";

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

        <form action={signInAction} className="flex flex-col gap-4">
          <input type="hidden" name="redirectTo" value={params.redirectTo ?? ""} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>

          <Button type="submit" className="w-full">
            Sign In
          </Button>

          <div className="flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
            <Link href="/sign-up" className="text-primary hover:underline">
              Create account
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
