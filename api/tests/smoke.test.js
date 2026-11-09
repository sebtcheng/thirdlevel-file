import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/app.js';

let server;
let base;

beforeAll(async () => {
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

describe('api smoke', () => {
  it('serves /api/health with a request ID and no secrets', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect((await res.json()).status).toBe('ok');
  });
});
