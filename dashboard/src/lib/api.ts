import type { ApiError } from "./types";

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiError;
    return body.message || "Request failed";
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

export function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString();
}
