import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) =>
          cookies.forEach((c) =>
            res.cookies.set(c.name, c.value, c.options)
          ),
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedPaths = ["/start", "/read", "/write", "/digest"];

  if (!user) return res;

  if (protectedPaths.some((p) => req.nextUrl.pathname.startsWith(p))) {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single();

    if (!data?.onboarding_completed) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  return res;
  
}
export const config = {
  matcher: ["/start/:path*", "/read/:path*", "/write/:path*", "/digest/:path*"],
};
