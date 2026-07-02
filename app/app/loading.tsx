export default function AppLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[var(--app-max-width)] flex-col gap-6 px-3 py-3 sm:px-5 sm:py-5">
      <div className="grid gap-5 lg:grid-cols-[var(--app-sidebar-width)_minmax(0,1fr)]">
        <div className="sidebar-shell hidden h-[calc(100vh-2.5rem)] animate-pulse rounded-[2rem] lg:block" />
        <div className="space-y-4">
          <div className="soft-card h-28 animate-pulse rounded-[2rem]" />
          <div className="soft-card h-[32.5rem] animate-pulse rounded-[2rem]" />
        </div>
      </div>
    </main>
  );
}
