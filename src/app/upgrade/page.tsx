import Link from "next/link";

export default function UpgradePage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-xl px-6 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Stillvo Plus</h1>
        <p className="mt-3 text-zinc-600">
          A calm upgrade. No ads. No manipulation.
        </p>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="text-sm font-medium text-zinc-900">Includes</div>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            <li>• Longer posts (2000 characters)</li>
            <li>• Optional longer retention (coming next)</li>
            <li>• Support a healthier platform</li>
          </ul>

          <form action="/api/subscribe" method="POST" className="mt-6">
            <button className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800">
              Upgrade to Plus
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-zinc-500">
            You can cancel anytime.
          </div>
        </div>

        <div className="mt-8">
          <Link href="/start" className="text-sm text-zinc-600 hover:text-zinc-900">
            Back
          </Link>
        </div>
      </div>
    </main>
  );
}
