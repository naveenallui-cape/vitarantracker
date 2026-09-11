import { cookies } from "next/headers";
import { ADMIN_TOKEN_COOKIE, apiBaseUrl } from "./auth-constants";
import type { ApiError } from "./types";

export async function serverApi<T>(path: string): Promise<T> {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  const response = await fetch(`${apiBaseUrl()}/api${path}`, {
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as ApiError;
      message = body.message || message;
    } catch {
      // keep status message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
