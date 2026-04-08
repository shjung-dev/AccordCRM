import { NextResponse } from "next/server";
import { refreshAccessToken, CognitoAuthError } from "@/lib/cognito";
import { REFRESH_TOKEN_COOKIE } from "@/app/api/auth/login/route";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/session";

function getCognitoConfig(): { clientId: string; region: string } | null {
  const clientId = process.env.COGNITO_CLIENT_ID?.trim();
  const region = process.env.COGNITO_REGION?.trim() || "ap-southeast-1";
  if (!clientId) return null;
  return { clientId, region };
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: "No refresh token." }, { status: 401 });
  }

  const config = getCognitoConfig();
  if (!config) {
    return NextResponse.json({ message: "Auth not configured." }, { status: 500 });
  }

  try {
    const { accessToken } = await refreshAccessToken(refreshToken, config.clientId, config.region);
    const isSecure = new URL(request.url).protocol === "https:";
    const response = NextResponse.json({ accessToken });
    response.cookies.set(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return response;
  } catch (err) {
    if (err instanceof CognitoAuthError) {
      return NextResponse.json({ message: "Session expired. Please log in again." }, { status: 401 });
    }
    return NextResponse.json({ message: "Failed to refresh session." }, { status: 500 });
  }
}
