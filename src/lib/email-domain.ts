const DEFAULT_DOMAINS = ["cityu.edu.hk", "my.cityu.edu.hk"];

export const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

const domains = allowedDomains.length ? allowedDomains : DEFAULT_DOMAINS;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isCityUEmail(email: string): boolean {
  const match = /^[^\s@]+@([^\s@]+)$/.exec(normalizeEmail(email));
  return !!match && domains.includes(match[1]);
}
