// Shared test helper: mocks global.fetch with a simple path -> response map, matching how
// shared/lib/api.js calls `fetch(BASE + path, ...)`. Each route can be a plain JSON value (200 OK)
// or a function (req) => value | { status, body } for more control.
import { vi } from 'vitest';

export function mockFetch(routes) {
  global.fetch = vi.fn((url, options = {}) => {
    const path = String(url).replace(/^https?:\/\/[^/]+/, '');
    const match = Object.keys(routes).find((key) => path.startsWith(key));
    if (!match) {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ detail: `no mock route for ${path}` }),
      });
    }
    let entry = routes[match];
    if (typeof entry === 'function') entry = entry({ url, path, options });
    const status = entry && typeof entry === 'object' && 'status' in entry ? entry.status : 200;
    const body = entry && typeof entry === 'object' && 'body' in entry ? entry.body : entry;
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    });
  });
  return global.fetch;
}
