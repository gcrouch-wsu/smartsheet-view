export default function LoadingViewPage() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="h-40 animate-pulse rounded-[2rem] bg-white/70" />
        <div className="h-12 animate-pulse rounded-full bg-white/70" />
        <div className="h-[32rem] animate-pulse rounded-[2rem] bg-white/70" />
      </div>
    </main>
  );
}
