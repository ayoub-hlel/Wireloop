import { signIn, hitApp, BASE } from './common.js';
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const diag = http.get(`${BASE}/api/diagnostics`);
  check(diag, { 'diagnostics 200': (r) => r.status === 200 });
  return signIn();
}

export default function (data) {
  hitApp(data);
}
