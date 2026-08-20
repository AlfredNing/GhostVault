/**
 * Website matching — decides whether a stored credential may be offered on
 * the current page. Matching is done on the *registrable domain* so that
 * look-alike hosts are rejected:
 *
 *   github.com        ↔ www.github.com        ✔ (same registrable domain)
 *   github.com        ↔ github.com/login      ✔ (path is irrelevant)
 *   github.com        ↔ evil-github.com       ✘ (different registrable domain)
 *   github.com        ↔ github.com.evil.com   ✘ (registrable domain = evil.com)
 *   login.github.com  ↔ github.com            ✔ (subdomain of the stored domain)
 */

/** Small suffix list for two-label public suffixes. */
const TWO_PART_TLDS = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk",
  "com.au", "net.au", "org.au",
  "com.br", "com.cn", "com.hk", "com.mx", "com.sg", "com.tw", "com.ar",
  "com.my", "com.ph", "com.vn", "com.co", "com.pe", "com.tr",
  "co.jp", "co.kr", "co.nz", "co.in", "net.in", "org.in",
  "net.nz", "org.nz",
]);

/** Lowercase hostname with `www.` stripped and no port. */
export function normalizeHost(hostname: string): string {
  let host = hostname.toLowerCase().trim();
  if (host.startsWith("www.")) host = host.slice(4);
  // Strip port if present (IPv6 brackets kept as-is).
  const bracket = host.indexOf("]");
  const colon = host.indexOf(":", bracket > 0 ? bracket : 0);
  if (colon > 0) host = host.slice(0, colon);
  return host;
}

/** Approximate registrable domain without a full public suffix list. */
export function registrableDomain(hostname: string): string {
  const host = normalizeHost(hostname);
  const labels = host.split(".").filter(Boolean);
  if (labels.length <= 2) return host; // localhost, IPs, or already registrable
  const lastTwo = labels.slice(-2).join(".");
  if (TWO_PART_TLDS.has(lastTwo)) return labels.slice(-3).join(".");
  return lastTwo;
}

/** Accepts full URLs or bare hostnames. */
export function domainFromUrl(urlOrHost: string): string {
  try {
    const url = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(urlOrHost)
        ? urlOrHost
        : `https://${urlOrHost}`,
    );
    return registrableDomain(url.hostname);
  } catch {
    return registrableDomain(urlOrHost);
  }
}

/**
 * True when a credential stored for `credentialDomain` may be used on
 * `pageDomain`. Rules:
 *  1. both must share the same registrable domain (kills look-alikes), and
 *  2. the page host must equal the stored host or be a subdomain of it —
 *     never the other way around (a credential saved for `login.github.com`
 *     must not fill `github.com`).
 */
export function matchesDomain(
  credentialDomain: string,
  pageDomain: string,
): boolean {
  const credHost = normalizeHost(credentialDomain);
  const pageHost = normalizeHost(pageDomain);
  if (!credHost || !pageHost) return false;

  if (registrableDomain(credHost) !== registrableDomain(pageHost)) return false;

  if (pageHost === credHost) return true;
  return pageHost.endsWith(`.${credHost}`);
}
