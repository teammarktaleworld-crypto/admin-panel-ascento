import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { isAuthenticatedServer } from "@/lib/server-auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const authenticated = await isAuthenticatedServer();

  if (!authenticated) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
