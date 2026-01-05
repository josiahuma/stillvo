"use client";
// stillvo/src/app/api/onboarding/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = {
  title: string;
  body: React.ReactNode;
  primary: string;
  secondary?: { label: string; action: "exit" | "back" };
};

export default function OnboardingPage() {
  const router = useRouter();
  const [i, setI] = useState(0);

  const steps: Step[] = [
    {
      title: "Welcome to Stillvo.",
      body: <p className="text-sm text-zinc-700">This is a quieter place on the internet.</p>,
      primary: "Continue",
    },
    {
      title: "What this is",
      body: (
        <div className="space-y-2 text-sm text-zinc-700">
          <p>Stillvo is a public space where people write without performing.</p>
          <p>There are no likes, no comments, and no direct messages.</p>
        </div>
      ),
      primary: "That sounds right",
      secondary: { label: "This isn’t for me", action: "exit" },
    },
    {
      title: "What this is not",
      body: (
        <div className="space-y-2 text-sm text-zinc-700">
          <p>Nothing is ranked.</p>
          <p>Nothing goes viral.</p>
          <p>Nothing is tracked publicly.</p>
        </div>
      ),
      primary: "Continue",
      secondary: { label: "Back", action: "back" },
    },
    {
      title: "How being seen works",
      body: (
        <div className="space-y-2 text-sm text-zinc-700">
          <p>When someone reads your writing, they can acknowledge it privately.</p>
          <p>You won’t see counts. You won’t see who sent them.</p>
          <p>You’ll receive them quietly, once a day.</p>
        </div>
      ),
      primary: "I understand",
      secondary: { label: "Back", action: "back" },
    },
    {
      title: "Take your time",
      body: (
        <div className="space-y-2 text-sm text-zinc-700">
          <p>There’s no pressure to post.</p>
          <p>You can read. You can write. You can leave and come back later.</p>
        </div>
      ),
      primary: "Continue",
      secondary: { label: "Back", action: "back" },
    },
    {
      title: "Ready when you are",
      body: (
        <div className="space-y-2 text-sm text-zinc-700">
          <p>To continue, create an account or sign in.</p>
          <p className="text-zinc-500">You don’t need to say much.</p>
        </div>
      ),
      primary: "Continue",
      secondary: { label: "Back", action: "back" },
    },
  ];

  const step = steps[i];

  async function next() {
  if (i === steps.length - 1) {
    await fetch("/api/profile/ensure", { method: "POST" });
    await fetch("/api/onboarding/complete", { method: "POST" });
    router.push("/start");
    return;
  }
  setI((v) => v + 1);
}


  function secondaryAction() {
    if (!step.secondary) return;
    if (step.secondary.action === "exit") {
      router.push("/");
      return;
    }
    if (step.secondary.action === "back") {
      setI((v) => Math.max(0, v - 1));
    }
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
        <div className="rounded-3xl border border-zinc-200 bg-white p-7">
          <div className="text-xs text-zinc-500">
            Step {i + 1} of {steps.length}
          </div>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {step.title}
          </h1>

          <div className="mt-4">{step.body}</div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={next}
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              {step.primary}
            </button>

            {step.secondary && (
              <button
                onClick={secondaryAction}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                {step.secondary.label}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          No likes. No comments. No direct messages.
        </p>
      </div>
    </main>
  );
}
