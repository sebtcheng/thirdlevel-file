const normalizeApiBaseUrl = (value) => {
  // Drop trailing slashes and a trailing "/api" segment: call sites already pass paths that start with
  // "/api/...", so a base of ".../insighted-third-level-officials/api" would resolve to ".../api/api/...".
  const trimmedValue = (value || '').trim().replace(/\/+$/, '').replace(/\/api$/i, '');

  if (!trimmedValue) return '';
  if (/^https?:\/\//i.test(trimmedValue)) return trimmedValue;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?/i.test(trimmedValue)) {
    return `http://${trimmedValue}`;
  }

  return trimmedValue;
};

// Pure helper (exported for tests): joins a base URL and an endpoint path into one URL.
export const buildApiUrl = (base, path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizeApiBaseUrl(base)}${normalizedPath}`;
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

export const apiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
