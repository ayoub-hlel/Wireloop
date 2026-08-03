import http from 'k6/http';
import { check, sleep } from 'k6';

// ponytail: shared logic lives here, load.js only overrides options.
export const BASE = __ENV.BASE_URL || 'http://localhost:5173';

export function signIn() {
  const res = http.post(
    `${BASE}/api/auth/sign-in/email`,
    JSON.stringify({ email: __ENV.K6_TEST_EMAIL, password: __ENV.K6_TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'sign-in 200': (r) => r.status === 200 });
  return { token: res.json('token') };
}

export function hitApp(data) {
  const jar = http.cookieJar();
  jar.set(BASE, 'better-auth.session_token', data.token);

  const page = http.get(`${BASE}/projects`);
  check(page, { 'page 200': (r) => r.status === 200 });

  const q = http.post(
    `${BASE}/api/query`,
    JSON.stringify({ name: 'projects:getDrafts', args: {} }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(q, { 'getDrafts 200': (r) => r.status === 200 });
  sleep(1);
}
