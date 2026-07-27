export default function SenderVerificationLoading() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f3ef] px-4 py-10 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(247,243,239,0)_44%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-2 text-[#2e6a56]">
            <img src="/massic-logo-green.svg" alt="" className="h-5 w-auto" />
            <span className="text-sm font-medium tracking-[0.16em]">MASSIC</span>
          </div>
        </div>
        <section className="rounded-[1.75rem] border border-white/80 bg-white/80 p-9 text-center shadow-[0_24px_80px_rgba(65,50,38,0.13)] backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
          </div>
          <h1 className="text-xl font-medium tracking-[-0.025em] text-neutral-900">Verifying email</h1>
          <p className="mt-2 text-sm text-neutral-500">This will only take a moment.</p>
        </section>
      </div>
    </main>
  );
}
