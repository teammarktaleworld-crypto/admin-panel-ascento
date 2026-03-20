import { redirect } from "next/navigation";

import { LoginView } from "@/components/auth/login-view";
import { isAuthenticatedServer } from "@/lib/server-auth";

export default async function LoginPage() {
  const authenticated = await isAuthenticatedServer();

  if (authenticated) {
    redirect("/dashboard");
  }

  return <LoginView />;
}
