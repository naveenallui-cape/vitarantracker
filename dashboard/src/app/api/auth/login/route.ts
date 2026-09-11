import { NextResponse } from "next/server";
import { ADMIN_TOKEN_COOKIE, apiBaseUrl } from "@/lib/auth";
import type { ApiError } from "@/lib/types";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    email?: string;
    password?: string;
  };

  try {
    const upstream = await fetch(`${apiBaseUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const body = (await upstream.json()) as
      | {
          accessToken: string;
          admin: { id: string; name: string; email: string };
        }
      | ApiError;

    if (!upstream.ok) {
      return NextResponse.json(body, { status: upstream.status });
    }

    const success = body as {
      accessToken: string;
      admin: { id: string; name: string; email: string };
    };

    const response = NextResponse.json({ admin: success.admin });
    response.cookies.set({
      name: ADMIN_TOKEN_COOKIE,
      value: success.accessToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Cannot reach the Vitarantracker API. Is the backend running?",
        code: "BACKEND_UNAVAILABLE",
      },
      { status: 503 },
    );
  }
}
