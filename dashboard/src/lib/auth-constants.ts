export const ADMIN_TOKEN_COOKIE = "vitarantracker_admin_token";

export function apiBaseUrl() {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  );
}
