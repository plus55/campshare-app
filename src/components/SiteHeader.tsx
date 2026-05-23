import { getSession } from "@/lib/session";
import { getUnreadCount } from "@/lib/notifications";
import SiteNav from "./SiteNav";

export default async function SiteHeader() {
  const session = await getSession();
  const user = session?.user ?? null;
  const unreadCount = user ? await getUnreadCount(user.id) : 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-cream relative">
      <SiteNav
        user={user ? { name: user.name ?? user.email ?? "", email: user.email ?? "" } : null}
        unreadCount={unreadCount}
      />
    </header>
  );
}
