import Link from "next/link";
import { getSession } from "@/lib/session";
import { getUnreadCount } from "@/lib/notifications";
import MobileMenuToggle from "./MobileMenuToggle";
import NavActive from "./NavActive";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";

export default async function SiteHeader() {
  const session = await getSession();
  const user = session?.user ?? null;
  const unreadCount = user ? await getUnreadCount(user.id) : 0;

  return (
    <header className="site-header">
      <nav className="nav" aria-label="Primary">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          CampShare
          <small>Aotearoa NZ</small>
        </Link>

        <ul className="nav-links">
          {user ? (
            <>
              <li><Link href="/vans">Find a van</Link></li>
              <li><Link href="/trips">My trips</Link></li>
              <li><Link href="/dashboard">Dashboard</Link></li>
            </>
          ) : (
            <>
              <li><Link href="/vans">Find a van</Link></li>
              <li><Link href="/apply">Become a host</Link></li>
            </>
          )}
        </ul>

        <div className="nav-cta">
          {user ? (
            <>
              <NotificationBell initialUnread={unreadCount} />
              <UserMenu
                name={user.name ?? user.email ?? "Account"}
                email={user.email ?? ""}
              />
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">Sign up</Link>
            </>
          )}
          <MobileMenuToggle />
        </div>

        <NavActive />
      </nav>
    </header>
  );
}
