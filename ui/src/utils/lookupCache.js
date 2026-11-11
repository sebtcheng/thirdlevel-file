import { apiUrl } from './api';

// Shares one in-flight/recent GET per URL + token. This removes the duplicate requests caused by React
// StrictMode double-mounting in dev and by several components asking for the same lookup (e.g. /positions).
// Failed responses are not cached, so the next call retries.
const cache = new Map();

// `returnErrorBody: true` resolves with the JSON body even for non-2xx responses (for callers that read `error`).
export function fetchLookupJson(path, { token, ttlMs = 60000, returnErrorBody = false } = {}) {
    const key = `${path}|${token || ''}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return hit.promise;

    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const promise = fetch(apiUrl(path), headers ? { headers } : undefined)
        .then(async (res) => {
            if (!res.ok && !returnErrorBody) throw new Error(`GET ${path} failed with ${res.status}`);
            return res.json();
        })
        .catch((err) => {
            if (cache.get(key)?.promise === promise) cache.delete(key);
            throw err;
        });
    cache.set(key, { promise, at: Date.now() });
    return promise;
}
