import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * Validates whether an IP address is private, loopback, link-local, multicast, or cloud metadata.
 * Uses bitwise checks for IPv4 and prefix checks for IPv6.
 */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) return true;

    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (Link-local & AWS/GCP metadata 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (parts[0] >= 224) return true;

    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    // ::1 (Loopback) or :: (Unspecified)
    if (normalized === '::1' || normalized === '::') return true;
    // fe80::/10 (Link-local)
    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true;
    }
    // fc00::/7 (Unique local address / private)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    // IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (normalized.includes('::ffff:')) {
      const ipv4Part = normalized.split('::ffff:')[1];
      if (ipv4Part && net.isIPv4(ipv4Part)) {
        return isPrivateIp(ipv4Part);
      }
    }
    return false;
  }

  // Not a valid IP format
  return true;
}

export interface SafeTarget {
  url: URL;
  safeIp: string;
  family: 4 | 6;
}

/**
 * Resolves a hostname, verifies that no resolved address points to private or restricted
 * infrastructure, and returns the pinned IP address to prevent DNS rebinding (TOCTOU).
 */
export async function resolveSafeTarget(inputUrl: string): Promise<SafeTarget> {
  let parsed: URL;
  try {
    parsed = new URL(inputUrl);
  } catch {
    throw new Error('Invalid URL format.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${parsed.protocol}. Only HTTP and HTTPS are permitted.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block obvious localhost / internal tokens
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan')
  ) {
    throw new Error('Target resolves to a restricted local hostname.');
  }

  // If hostname is directly an IP literal
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(`Scanning private or restricted IP (${hostname}) is forbidden.`);
    }
    const family = net.isIPv4(hostname) ? 4 : 6;
    return { url: parsed, safeIp: hostname, family };
  }

  // Resolve hostname via DNS
  try {
    const lookup = await dns.lookup(hostname, { all: true });
    if (!lookup || lookup.length === 0) {
      throw new Error(`Unable to resolve host: ${hostname}`);
    }

    // Verify all resolved addresses
    for (const record of lookup) {
      if (isPrivateIp(record.address)) {
        throw new Error(
          `Host ${hostname} resolves to restricted address ${record.address}. Request blocked.`
        );
      }
    }

    const primary = lookup[0];
    return {
      url: parsed,
      safeIp: primary.address,
      family: primary.family as 4 | 6,
    };
  } catch (err: any) {
    if (err.message?.includes('resolves to restricted address')) throw err;
    throw new Error(`DNS resolution failed for host "${hostname}": ${err.message || 'Host not found'}`);
  }
}

/**
 * Validates a URL and asserts that it does not target private or restricted infrastructure.
 */
export async function assertSafeUrl(inputUrl: string): Promise<URL> {
  const target = await resolveSafeTarget(inputUrl);
  return target.url;
}

/**
 * Helper to build a DNS lookup callback that pins connections to the verified safe IP.
 * Defeats DNS rebinding TOCTOU attacks.
 */
export function createPinnedLookup(safeIp: string, family: 4 | 6) {
  return (
    _hostname: string,
    options: any,
    callback: (err: NodeJS.ErrnoException | null, address: any, family?: number) => void
  ) => {
    const cb = typeof options === 'function' ? options : callback;
    const opts = typeof options === 'object' && options !== null ? options : {};
    if (opts.all) {
      cb(null, [{ address: safeIp, family }]);
    } else {
      cb(null, safeIp, family);
    }
  };
}
