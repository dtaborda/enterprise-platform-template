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
import { updatePasswordAction } from "@/features/auth/actions";

export const metadata = { title: "Reset Password" };

interface ResetPasswordPageProps {
  searchParams?: Promise<{ error?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a new password to secure your account</CardDescription>
      </CardHeader>
      <CardContent>
        {params.error ? (
          <p className="mb-4 rounded-md bg-surface-container-high px-3 py-2 text-sm text-foreground">
            We could not update your password. Request a new link and try again.
          </p>
        ) : null}

        <form action={updatePasswordAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={8}
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Update password
          </Button>
        </form>

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
