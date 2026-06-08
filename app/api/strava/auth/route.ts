import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/strava/callback`;

  const stravaAuthUrl = new URL("https://www.strava.com/oauth/authorize");
  stravaAuthUrl.searchParams.set("client_id", clientId ?? "");
  stravaAuthUrl.searchParams.set("redirect_uri", redirectUri);
  stravaAuthUrl.searchParams.set("response_type", "code");
  stravaAuthUrl.searchParams.set("approval_prompt", "auto");
  stravaAuthUrl.searchParams.set("scope", "activity:read_all");

  return NextResponse.redirect(stravaAuthUrl.toString());
}
