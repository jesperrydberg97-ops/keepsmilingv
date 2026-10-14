export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export const NAV = [
  { href: "/projects", label: "Projects" },
  { href: "/prints", label: "Prints" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Journal" },
  { href: "/timeline", label: "Timeline" },
  { href: "/music", label: "Music" },
  { href: "/contact", label: "Contact" },
] as const;

export function formatPrice(minor: number | null, currency: string): string {
  if (minor === null) return "Price on request";
  return new Intl.NumberFormat("en-SE", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
}

export function formatDate(d: string): string {
  const parts = d.split("-").map(Number);
  if (parts.length === 1) return String(parts[0]);
  const date = new Date(Date.UTC(parts[0]!, (parts[1] ?? 1) - 1, parts[2] ?? 1));
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "long",
    ...(parts.length === 3 ? { day: "numeric" } : {}),
    timeZone: "UTC",
  }).format(date);
}
