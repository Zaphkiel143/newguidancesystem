import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Keeps people signed in while they keep using E-Gabay
const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });
  }
  return response;
}

export const config = {
  // Pages only: not API routes, Next.js assets, or files like images
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff2?|txt|xml)$).*)"],
};
