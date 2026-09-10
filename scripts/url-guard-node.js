// ─── Garde d'URL et protection SSRF — module partagé des nœuds Code n8n ──────
//
// Extrait du nœud `V4 Fetch Selected Pages` d'intel-030 (Lot 0.7), qui a été supprimé
// quand INTEL-030 a cessé de récupérer des pages. Le code, lui, reste la référence :
// il a été durci et testé — IPv4 privées, `.local`/`.internal`/`.lan`, IPv6 locales,
// moteurs de recherche exclus, et aucun recours au constructeur global `URL`, absent
// du sandbox des nœuds Code n8n.
//
// Ce fichier n'est jamais exécuté tel quel : il est INJECTÉ par les générateurs
// (`scripts/build-intel-035.py`). Toute évolution se fait ICI, puis on rejoue les
// générateurs ; les harnais assertent que le bloc injecté est identique à ce fichier.

function parseUrl(value) {
  if (!value || typeof value !== 'string') {
    return { valid: false, reason: 'missing_url' };
  }
  let v = value.trim();
  if (v.length === 0) {
    return { valid: false, reason: 'missing_url' };
  }

  if (v.startsWith('//')) {
    v = 'https:' + v;
  } else if (!/^https?:\/\//i.test(v)) {
    if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(v)) {
      v = 'https://' + v;
    } else {
      return { valid: false, reason: 'invalid_protocol' };
    }
  }

  const match = v.match(/^(https?):\/\/([^/?#:]+)(?::(\d+))?([^#]*)(?:#.*)?$/i);
  if (!match) {
    return { valid: false, reason: 'parser_error' };
  }

  const protocol = match[1].toLowerCase() + ':';
  let hostname = match[2].toLowerCase();
  const port = match[3] ? Number(match[3]) : null;
  let pathnameAndSearch = match[4] || '/';
  if (!pathnameAndSearch.startsWith('/')) {
    pathnameAndSearch = '/' + pathnameAndSearch;
  }

  if (protocol !== 'http:' && protocol !== 'https:') {
    return { valid: false, reason: 'invalid_protocol' };
  }

  if (hostname.endsWith('.')) {
    hostname = hostname.slice(0, -1);
  }

  if (!hostname || !hostname.includes('.')) {
    return { valid: false, reason: 'invalid_hostname' };
  }

  if (!/^[a-z0-9.-]+$/i.test(hostname) || hostname.startsWith('.') || hostname.endsWith('.')) {
    return { valid: false, reason: 'invalid_hostname' };
  }

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.home') ||
    hostname.endsWith('.invalid')
  ) {
    return { valid: false, reason: 'invalid_hostname' };
  }

  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = [Number(ipv4Match[1]), Number(ipv4Match[2]), Number(ipv4Match[3]), Number(ipv4Match[4])];
    if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) {
      return { valid: false, reason: 'invalid_hostname' };
    }
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127) return { valid: false, reason: 'private_network' };
    if (a === 169 && b === 254) return { valid: false, reason: 'private_network' };
    if (a === 172 && b >= 16 && b <= 31) return { valid: false, reason: 'private_network' };
    if (a === 192 && b === 168) return { valid: false, reason: 'private_network' };
    if (a >= 224) return { valid: false, reason: 'private_network' };
  }

  if (
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname.startsWith('fe80:') ||
    hostname.startsWith('[fe80:')
  ) {
    return { valid: false, reason: 'private_network' };
  }

  if (/(?:^|\.)(?:google|bing|yahoo|duckduckgo|qwant|ecosia|yandex|baidu)\./i.test(hostname)) {
    return { valid: false, reason: 'search_engine' };
  }

  const portPart = port ? ':' + port : '';
  const clean = protocol + '//' + hostname + portPart + pathnameAndSearch;
  const hostWithoutWww = hostname.replace(/^www\./i, '');

  return {
    valid: true,
    clean,
    hostname,
    hostWithoutWww,
    protocol,
  };
}
