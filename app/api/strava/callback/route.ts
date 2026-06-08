import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/setup?strava=error`);
  }

  try {
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return NextResponse.redirect(`${appUrl}/setup?strava=error`);
    }

    // Show the refresh token so user can copy it to .env.local
    const refreshToken = tokens.refresh_token;
    const athleteName = tokens.athlete?.firstname ?? "Atleta";

    return NextResponse.redirect(
      `${appUrl}/setup?strava=ok&refresh_token=${refreshToken}&name=${encodeURIComponent(athleteName)}`
    );
  } catch {
    return NextResponse.redirect(`${appUrl}/setup?strava=error`);
  }
}
