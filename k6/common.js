import http from 'k6/http';
import { check, sleep } from 'k6';

export const BASE = __ENV.BASE_URL || 'http://localhost:5173';

// ponytail: Better Auth returns session token in Set-Cookie header, not JSON body.
export function signIn() {
  const res = http.post(
    `${BASE}/api/auth/sign-in/email`,
    JSON.stringify({ email: __ENV.K6_TEST_EMAIL, password: __ENV.K6_TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'sign-in 200': (r) => r.status === 200 });
  const setCookie = res.headers['Set-Cookie'] || res.headers['set-cookie'] || '';
  const token = setCookie.match(/better-auth\.session_token=([^;]+)/)?.[1];
  check(token, { 'token extracted': !!token });
  return { token };
}

export function authCookie(token) {
  return `better-auth.session_token=${token}`;
}

export function query(name, args, token) {
  return http.post(
    `${BASE}/api/query`,
    JSON.stringify({ name, args: args || {} }),
    { headers: { 'Content-Type': 'application/json', Cookie: authCookie(token), Origin: BASE } },
  );
}

export function mutate(name, args, token) {
  return http.post(
    `${BASE}/api/mutation`,
    JSON.stringify({ name, args: args || {} }),
    { headers: { 'Content-Type': 'application/json', Cookie: authCookie(token), Origin: BASE } },
  );
}

export function hitApp(data) {
  const page = http.get(`${BASE}/projects`, {
    headers: { Cookie: authCookie(data.token) },
  });
  check(page, { 'page 200': (r) => r.status === 200 });

  const q = query('projects:list', { filter: 'projects' }, data.token);
  check(q, { 'list 200': (r) => r.status === 200 });
  sleep(1);
}
