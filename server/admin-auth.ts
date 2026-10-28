import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "ds_admin";
const TWO_WEEKS = 60 * 60 * 24 * 14;

function password() {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

export function adminConfigured() {
  return password().length >= 8;
}

function secret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || password();
}

function same(left: string, right: string) {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

export function checkPassword(input: string) {
  if (!adminConfigured()) return false;
  return same(input, password());
}

export function sessionCookie(secure: boolean) {
  const exp = Date.now() + TWO_WEEKS * 1000;
  const sig = createHmac("sha256", secret()).update(String(exp)).digest("base64url");
  const value = `${exp}.${sig}`;
  const parts = [`${COOKIE}=${value}`, "HttpOnly", "SameSite=Lax", "Path=/", `Max-Age=${TWO_WEEKS}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearCookie() {
  return `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function readSession(cookieHeader: string | undefined) {
  if (!adminConfigured() || !cookieHeader) return false;
  const match = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
  if (!match) return false;
  const value = match.slice(COOKIE.length + 1);
  const [exp, sig] = value.split(".");
  if (!exp || !sig) return false;
  const expected = createHmac("sha256", secret()).update(exp).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  return Number(exp) > Date.now();
}
