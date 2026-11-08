import { NextResponse, type NextRequest } from "next/server";
import { entraAuthorizeUrl, entraConfigured, entraRedirectUri, newEntraAttempt } from "../../../../../lib/entra";

// Step 1 of "Continue with Microsoft": remember this attempt in a short-lived
// cookie and send the browser to Microsoft's sign-in page.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  if (!entraConfigured()) return NextResponse.redirect(`${origin}/Login?entra_error=off`);

  const attempt = newEntraAttempt();
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  const response = NextResponse.redirect(
    entraAuthorizeUrl({
      state: attempt.state,
      nonce: attempt.nonce,
      challenge: attempt.challenge,
      redirectUri: entraRedirectUri(origin),
      loginHint: email && /^[^\s@]+@[^\s@]+$/.test(email) ? email : undefined,
    })
  );
  response.cookies.set("entra_attempt", JSON.stringify({ state: attempt.state, nonce: attempt.nonce, verifier: attempt.verifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax still sends it when Microsoft redirects the browser back here.
    sameSite: "lax",
    path: "/api/auth/entra",
    maxAge: 10 * 60,
  });
  return response;
}
