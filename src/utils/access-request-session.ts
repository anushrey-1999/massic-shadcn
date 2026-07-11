const ACCESS_SESSION_PREFIX = "massic-access-session";

const memorySessions = new Map<string, string>();

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAccessSessionKey(token: string) {
  return `${ACCESS_SESSION_PREFIX}:${token}`;
}

export function readAccessSession(token: string) {
  if (!token) return null;

  const key = getAccessSessionKey(token);
  const memoryValue = memorySessions.get(key) || null;

  if (!canUseBrowserStorage()) return memoryValue;

  try {
    return window.localStorage.getItem(key) || memoryValue;
  } catch {
    return memoryValue;
  }
}

export function writeAccessSession(token: string, sessionToken: string) {
  if (!token || !sessionToken) return;

  const key = getAccessSessionKey(token);
  memorySessions.set(key, sessionToken);

  if (!canUseBrowserStorage()) return;

  try {
    window.localStorage.setItem(key, sessionToken);
  } catch {
    // Keep the in-memory value so private-mode/storage-blocked browsers still work for this load.
  }
}

export function clearAccessSession(token: string) {
  if (!token) return;

  const key = getAccessSessionKey(token);
  memorySessions.delete(key);

  if (!canUseBrowserStorage()) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing else to clear when browser storage is unavailable.
  }
}
