export interface JwtPayload {
  exp?: number;
  [key: string]: any;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const paddedPayload = payload.padEnd(
      payload.length + ((4 - (payload.length % 4)) % 4),
      "="
    );
    const base64 = paddedPayload.replace(/-/g, "+").replace(/_/g, "/");

    // In browser/edge environment
    if (typeof window !== "undefined" || typeof atob === "function") {
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    }

    // Fallback for Node environment if atob is not available globally (though it usually is in recent Node)
    // but just to be safe and simple without external deps if possible.
    // However, Buffer is available in Node.
    if (typeof Buffer !== "undefined") {
      return JSON.parse(Buffer.from(base64, 'base64').toString());
    }

    return null;
  } catch (e) {
    console.error("Failed to decode JWT", e);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeJwt(token);
    if (!decoded || typeof decoded.exp === "undefined") {
      // If we can't decode it or it has no expiration, we can't treat it as expired based on time.
      // Depending on policy, invalid token could be treated as expired, but here we strictly check time.
      // If it's invalid, the API will 401 anyway.
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (e) {
    return false;
  }
}
