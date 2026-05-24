export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-muted px-4 py-12">
      <div className="mx-auto max-w-[460px]">{children}</div>
    </main>
  );
}
