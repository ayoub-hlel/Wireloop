import { signIn, query, mutate, authCookie, BASE } from './common.js';
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    // ponytail: stress test — relaxed thresholds, goal is to find the breaking point.
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.20'],
  },
};

export function setup() {
  const diag = http.get(`${BASE}/api/diagnostics`);
  check(diag, { 'diagnostics ok': (r) => r.status === 200 });
  return signIn();
}

export default function (data) {
  const t = data.token;

  // reads (60%)
  const list = query('projects:list', { filter: 'projects' }, t);
  check(list, { 'list 200': (r) => r.status === 200 });

  const settings = query('users:getUserSettings', {}, t);
  check(settings, { 'settings 200': (r) => r.status === 200 });

  const notifs = query('notifications:list', {}, t);
  check(notifs, { 'notifications 200': (r) => r.status === 200 });

  // writes (30%)
  if (__ITER % 3 === 0) {
    const created = mutate('projects:createProject', {
      name: `stress-${__VU}-${__ITER}`,
      boardType: 'uno',
    }, t);
    const pid = created.json()?.projectId;
    if (pid) {
      mutate('projects:saveProjectFile', { projectId: pid, content: '<xml/>' }, t);
      mutate('projects:deleteProject', { projectId: pid }, t);
    }
  }

  // diagnostics (10%) — no auth needed
  if (__ITER % 10 === 0) {
    const diag = http.get(`${BASE}/api/diagnostics`);
    check(diag, { 'diag 200': (r) => r.status === 200 });
  }

  sleep(0.5);
}
