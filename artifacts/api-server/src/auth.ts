import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";

const isProd = process.env.NODE_ENV === "production";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (isProd) {
    throw new Error(
      "SESSION_SECRET environment variable is required in production",
    );
  }
  return "dev-only-secret-do-not-use-in-prod-1234567890";
}

export function getDemoCredentials(): { email: string; password: string } | null {
  const email = process.env.MOBILE_LOGIN_EMAIL;
  const password = process.env.MOBILE_LOGIN_PASSWORD;
  if (email && password) return { email: email.toLowerCase(), password };
  if (isProd) return null;
  return { email: "rep@pricepro.com", password: "pricepro" };
}

export function signToken(email: string): string {
  const sig = createHmac("sha256", getSecret())
    .update(email.toLowerCase())
    .digest("hex");
  return `${Buffer.from(email.toLowerCase()).toString("base64url")}.${sig}`;
}

export function verifyToken(token: string): { email: string } | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const emailPart = token.slice(0, dot);
  const sigPart = token.slice(dot + 1);
  let email: string;
  try {
    email = Buffer.from(emailPart, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!email) return null;
  const expected = createHmac("sha256", getSecret())
    .update(email.toLowerCase())
    .digest("hex");
  const a = Buffer.from(sigPart, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || a.length === 0) return null;
  if (!timingSafeEqual(a, b)) return null;
  return { email: email.toLowerCase() };
}

export interface AuthedRequest extends Request {
  auth?: { email: string };
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const token = header.slice(7).trim();
  const verified = verifyToken(token);
  if (!verified) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
  req.auth = verified;
  next();
}
