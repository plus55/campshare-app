import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export async function getSession() {
  const session = await (await auth()).api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  const admin = process.env.ADMIN_EMAIL ?? "jontydavies7@gmail.com";
  if (session.user.email !== admin) redirect("/dashboard");
  return session;
}
