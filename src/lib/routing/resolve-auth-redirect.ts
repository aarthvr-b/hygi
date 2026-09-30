const PUBLIC_PATH = "/login";
const HOME_PATH = "/";

// Returns null when the request may proceed to `pathname` as-is.
export function resolveAuthRedirect(
  pathname: string,
  hasSession: boolean,
): string | null {
  if (!hasSession && pathname !== PUBLIC_PATH) {
    return PUBLIC_PATH;
  }

  if (hasSession && pathname === PUBLIC_PATH) {
    return HOME_PATH;
  }

  return null;
}
