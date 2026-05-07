import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@enterprise/ui/components/card";
import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata = { title: "Forgot Password" };

interface ForgotPasswordPageProps {
  searchParams?: Promise<{ sent?: string }>;
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

        <ForgotPasswordForm />

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
