import Link from "next/link";
import { getSession } from "@/lib/session";
import MobileMenuToggle from "./MobileMenuToggle";
import NavActive from "./NavActive";
import UserMenu from "./UserMenu";

export default async function SiteHeader() {
  const session = await getSession();
  const user = session?.user ?? null;

  return (
    <header className="site-header">
      <nav className="nav" aria-label="Primary">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          CampShare
          <small>Aotearoa NZ</small>
        </Link>

        <ul className="nav-links">
          <li><Link href="/vans">Browse vans</Link></li>
          {user ? (
            <>
              <li><Link href="/trips">My trips</Link></li>
              <li><Link href="/dashboard">Dashboard</Link></li>
            </>
          ) : (
            <>
              <li><Link href="/vans">Hire</Link></li>
              <li><Link href="/apply">Become a host</Link></li>
            </>
          )}
        </ul>

        <div className="nav-cta">
          {user ? (
            <UserMenu
              name={user.name ?? user.email ?? "Account"}
              email={user.email ?? ""}
            />
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
