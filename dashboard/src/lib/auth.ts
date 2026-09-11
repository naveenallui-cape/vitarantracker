import { cookies } from "next/headers";
import { ADMIN_TOKEN_COOKIE } from "./auth-constants";

export { ADMIN_TOKEN_COOKIE, apiBaseUrl } from "./auth-constants";

export async function getAdminToken() {
  const store = await cookies();
  return store.get(ADMIN_TOKEN_COOKIE)?.value;
}
