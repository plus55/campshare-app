import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <span className="brand-mark" aria-hidden="true" />
              <strong>CampShare</strong>
            </div>
            <p className="footer-tag">
              A community of Kiwi campervan owners sharing their hand-built homes with travellers.
            </p>
          </div>

          <div className="footer-col">
            <h5>Hire</h5>
            <ul>
              <li><Link href="/vans">All vans</Link></li>
              <li><Link href="/hire/auckland">Auckland</Link></li>
              <li><Link href="/hire/queenstown">Queenstown</Link></li>
              <li><Link href="/hire/christchurch">Christchurch</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Own</h5>
            <ul>
              <li><Link href="/apply">List your van</Link></li>
              <li><a href="https://www.campshare.co.nz/buyback">Buyback</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Company</h5>
            <ul>
              <li><a href="https://www.campshare.co.nz/about">About</a></li>
              <li><a href="https://www.campshare.co.nz/faq">FAQ</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Legal</h5>
            <ul>
              <li><a href="https://www.campshare.co.nz">Terms</a></li>
              <li><a href="https://www.campshare.co.nz">Privacy</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {year} CampShare Aotearoa Ltd. Made in NZ.</span>
          <span>Ngā mihi nui — travel safe.</span>
        </div>
      </div>
    </footer>
  );
}
