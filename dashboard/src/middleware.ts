import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  const isLogin = request.nextUrl.pathname === "/login";

  if (!token && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
