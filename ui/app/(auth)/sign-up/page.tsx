import { Button } from "@enterprise/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@enterprise/ui/components/card";
import { Input } from "@enterprise/ui/components/input";
import { Label } from "@enterprise/ui/components/label";
import { signUpAction } from "@/features/auth/actions";
import Link from "next/link";

export const metadata = { title: "Sign Up" };

interface SignUpPageProps {
  searchParams?: Promise<{ error?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Get started with the platform starter in minutes</CardDescription>
      </CardHeader>
      <CardContent>
        {params.error ? (
          <p className="mb-4 rounded-md bg-surface-container-high px-3 py-2 text-sm text-foreground">
            We could not create your account. Check your inputs and try again.
          </p>
        ) : null}

        <form action={signUpAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" type="text" placeholder="Jane Doe" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>

          <Button type="submit" className="w-full">
            Create account
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
