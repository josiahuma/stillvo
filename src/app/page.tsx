// stillvo/src/app/page.tsx
import Image from "next/image";
import AuthPanel from "@/components/AuthPanel";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-12 px-6 py-12 md:grid-cols-2">
        {/* Left */}
        <div className="flex flex-col items-start">
          <Image
            src="/brand/stillvo.png"
            alt="Stillvo"
            width={520}
            height={520}
            priority
            className="h-auto w-[260px] md:w-[420px]"
          />
        </div>

        {/* Right */}
        <div className="flex justify-start md:justify-end">
          <AuthPanel />
        </div>
      </div>
    </main>
  );
}
