import Link from "next/link";

export default function AppNav() {
  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
        <Link href="/start" className="text-sm font-semibold tracking-tight">
          stillvo
        </Link>

        <div className="flex items-center gap-4 text-sm text-zinc-600">
          <Link href="/read" className="hover:text-zinc-900">
            Read
          </Link>
          <Link href="/write" className="hover:text-zinc-900">
            Write
          </Link>
          <Link href="/digest" className="hover:text-zinc-900">
            Digest
          </Link>
          <form action="/auth/logout" method="post">
            <button className="hover:text-zinc-900" type="submit">
              Log out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
