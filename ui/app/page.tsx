import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/queries";
import { ROUTES } from "@/lib/routes";

export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(user ? ROUTES.dashboard : "/sign-in");
}
