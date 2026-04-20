const SAFE_REDIRECT_FALLBACK = "/dashboard";

function canUseInternalPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return false;
  }

  if (path.includes("\\") || path.includes("\n") || path.includes("\r")) {
    return false;
  }

  return true;
}

export function normalizeSafeRedirectPath(
  value: string | null | undefined,
  fallback: string = SAFE_REDIRECT_FALLBACK,
): string {
  const raw = value?.trim();

  if (!raw || !canUseInternalPath(raw)) {
    return fallback;
  }

  return raw;
}
