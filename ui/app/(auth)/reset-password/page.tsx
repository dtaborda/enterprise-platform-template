import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@enterprise/ui/components/card";
import Link from "next/link";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata = { title: "Reset Password" };

export default async function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a new password to secure your account</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Return to{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            sign in
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
