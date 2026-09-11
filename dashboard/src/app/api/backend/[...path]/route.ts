import { NextRequest, NextResponse } from "next/server";
import { ADMIN_TOKEN_COOKIE, apiBaseUrl } from "@/lib/auth";

async function proxy(request: NextRequest, path: string[]) {
  const target = `${apiBaseUrl()}/api/${path.join("/")}${request.nextUrl.search}`;
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  const headers = new Headers();

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  const responseHeaders = new Headers();
  const passThrough = ["content-type", "content-disposition"];
  for (const name of passThrough) {
    const value = upstream.headers.get(name);
    if (value) {
      responseHeaders.set(name, value);
    }
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}
