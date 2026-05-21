export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="cs-page">
      <div className="cs-narrow">{children}</div>
    </main>
  );
}
