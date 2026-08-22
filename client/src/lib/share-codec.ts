import { BuildSet } from "./warframe-data";

export interface SharedPayload {
  version: number;
  builds: BuildSet[];
  activeBuildId?: string;
  comparison?: {
    variantA: BuildSet;
    variantB: BuildSet;
  };
}

export function encodeSharedPayload(payload: SharedPayload): string {
  try {
    const jsonStr = JSON.stringify(payload);
    const utf8Bytes = new TextEncoder().encode(jsonStr);
    let binary = "";
    const len = utf8Bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    const base64 = btoa(binary);
    // URL-safe base64
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (error) {
    console.error("Failed to encode share payload:", error);
    return "";
  }
}

export function decodeSharedPayload(encoded: string): SharedPayload | null {
  try {
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonStr);
    if (parsed && Array.isArray(parsed.builds)) {
      return parsed as SharedPayload;
    }
    return null;
  } catch (error) {
    console.error("Failed to decode share payload:", error);
    return null;
  }
}
