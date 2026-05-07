import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@enterprise/ui/components/card";
import Link from "next/link";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata = { title: "Sign Up" };

export default async function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Get started with the platform starter in minutes</CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm />

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
