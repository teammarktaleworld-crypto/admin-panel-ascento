import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/constants";

export async function isAuthenticatedServer(): Promise<boolean> {
  const store = await cookies();
  return !!store.get(SESSION_COOKIE)?.value;
}
