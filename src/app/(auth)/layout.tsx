export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="cs-page">
      <div className="cs-narrow">
        <a href="https://www.campshare.co.nz" className="cs-brand">
          CampShare
        </a>
        {children}
      </div>
    </main>
  );
}
