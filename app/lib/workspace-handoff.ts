import crypto from "node:crypto";

export interface HandoffPayload {
  email: string;
  name: string;
  tenant: string;
  exp: number;
}

const DEFAULT_TTL_SECONDS = 60;

function getHandoffSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing NEXTAUTH_SECRET for workspace handoff signing.");
  }
  return secret;
}

function signPayload(encodedPayload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

export function createHandoffToken(
  input: { email: string; name?: string | null; tenant: string },
  options?: { secret?: string; ttlSeconds?: number; nowMs?: number }
): string {
  const secret = options?.secret ?? getHandoffSecret();
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const nowMs = options?.nowMs ?? Date.now();

  const payload: HandoffPayload = {
    email: input.email.trim().toLowerCase(),
    name: (input.name || "").trim(),
    tenant: input.tenant.trim().toLowerCase(),
    exp: Math.floor(nowMs / 1000) + ttlSeconds,
  };

  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(encoded, secret);
  return `${encoded}.${signature}`;
}

export function verifyHandoffToken(
  token: string,
  expectedTenant: string,
  options?: { secret?: string; nowMs?: number }
): HandoffPayload | null {
  if (!token || !expectedTenant) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;

  try {
    const secret = options?.secret ?? getHandoffSecret();
    const expectedSig = signPayload(encoded, secret);

    const a = Buffer.from(providedSig, "utf8");
    const b = Buffer.from(expectedSig, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as HandoffPayload;

    if (
      !decoded ||
      typeof decoded.email !== "string" ||
      !decoded.email ||
      typeof decoded.tenant !== "string" ||
      typeof decoded.exp !== "number"
    ) {
      return null;
    }

    const nowSec = Math.floor((options?.nowMs ?? Date.now()) / 1000);
    if (decoded.exp < nowSec) {
      return null;
    }

    if (decoded.tenant.toLowerCase() !== expectedTenant.trim().toLowerCase()) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
