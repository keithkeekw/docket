/**
 * DESIGN §4 LinkBadge: a short ID derived from the URL ("ZD-48213", "OPS-112").
 * The rule is deliberately plain: a `KEY-123` segment wins, a Zendesk ticket
 * number becomes `ZD-<n>`, otherwise the last path segment is used. The user
 * can always override the label when adding the link.
 */
export function deriveLinkLabel(rawUrl: string): string {
  const url = new URL(rawUrl);
  const segments = url.pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));

  const keyed = segments.find((segment) => /^[A-Za-z][A-Za-z0-9]*-\d+$/.test(segment));
  if (keyed) return keyed.toUpperCase();

  const last = segments.at(-1);
  const host = url.hostname.replace(/^www\./, '');

  if (last) {
    if (/zendesk\./i.test(host) && /^\d+$/.test(last)) return `ZD-${last}`;
    return last.length > 24 ? `${last.slice(0, 21)}…` : last;
  }

  return host || rawUrl;
}
