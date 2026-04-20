import { Button } from "@enterprise/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@enterprise/ui/components/card";
import { Input } from "@enterprise/ui/components/input";
import { Label } from "@enterprise/ui/components/label";
import Link from "next/link";
import { forgotPasswordAction } from "@/features/auth/actions";

export const metadata = { title: "Forgot Password" };

interface ForgotPasswordPageProps {
  searchParams?: Promise<{ sent?: string; error?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>Request a password reset link for your account</CardDescription>
      </CardHeader>
      <CardContent>
        {params.sent ? (
          <p className="mb-4 rounded-md bg-surface-container-high px-3 py-2 text-sm text-foreground">
            If the account exists, a reset link has been sent to the provided email.
          </p>
        ) : null}
        {params.error ? (
          <p className="mb-4 rounded-md bg-surface-container-high px-3 py-2 text-sm text-foreground">
            We could not process your request. Please try again.
          </p>
        ) : null}

        <form action={forgotPasswordAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>

          <Button type="submit" className="w-full">
            Send reset link
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
