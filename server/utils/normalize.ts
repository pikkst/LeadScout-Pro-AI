// Normalize a website/URL into a comparable domain host:
// lowercase, strip protocol, "www." and path. e.g. "https://WWW.Pipedrive.com/x" -> "pipedrive.com"
export function normalizeDomain(website: string): string {
  return (website || "")
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "") // strip protocol
    .replace(/^www\./, "") // strip leading www.
    .split("/")[0] // keep host only
    .split("?")[0]
    .trim();
}

// Normalize an email for case-insensitive comparison.
export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}
