import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Root page — redirects based on authentication status:
 * - Authenticated → /dashboard
 * - Unauthenticated → /sign-in
 */
export default async function RootPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  } else {
    redirect("/sign-in");
  }
}
