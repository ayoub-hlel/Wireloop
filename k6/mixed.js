import { signIn, query, mutate, authCookie, BASE } from './common.js';
import http from 'k6/http';
import { check, sleep } from 'k6';

// ponytail: open() must be called at init stage — store buffer globally.
const PNG_PATH = `${__ENV.K6_FIXTURE_DIR || './fixtures'}/test.png`;
const PNG_BUFFER = open(PNG_PATH, 'b');

// ponytail: three parallel scenarios — exec points each to a different function.
export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      exec: 'browse',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 30 },
        { duration: '2m', target: 30 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
    edit: {
      executor: 'ramping-vus',
      exec: 'edit',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 15 },
        { duration: '2m', target: 15 },
        { duration: '30s', target: 0 },
      ],
      startTime: '10s',
      gracefulRampDown: '10s',
    },
    upload: {
      executor: 'ramping-vus',
      exec: 'upload',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '2m', target: 5 },
        { duration: '30s', target: 0 },
      ],
      startTime: '20s',
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

export function setup() {
  return signIn();
}

// ponytail: browse scenario — read-only, high volume (60% of VUs).
export function browse(data) {
  const t = data.token;

  const list = query('projects:list', { filter: 'projects' }, t);
  check(list, { 'list 200': (r) => r.status === 200 });

  const profile = query('users:getUserProfile', {}, t);
  check(profile, { 'profile 200': (r) => r.status === 200 });

  const orgs = query('org:getUserOrgs', {}, t);
  check(orgs, { 'orgs 200': (r) => r.status === 200 });

  const notifs = query('notifications:list', {}, t);
  check(notifs, { 'notifs 200': (r) => r.status === 200 });

  sleep(2);
}

// ponytail: edit scenario — create, save, update, delete cycle (30% of VUs).
export function edit(data) {
  const t = data.token;

  const created = mutate('projects:createProject', {
    name: `mix-edit-${__VU}-${__ITER}`,
    boardType: 'nano',
  }, t);
  const pid = created.json()?.projectId;
  if (!pid) { sleep(1); return; }

  const saved = mutate('projects:saveProjectFile', {
    projectId: pid,
    content: '<xml><block type="motor"></block></xml>',
  }, t);
  check(saved, { 'saveFile 200': (r) => r.status === 200 });

  const updated = mutate('projects:updateProject', {
    projectId: pid,
    description: 'load test edit',
  }, t);
  check(updated, { 'update 200': (r) => r.status === 200 });

  const deleted = mutate('projects:deleteProject', { projectId: pid }, t);
  check(deleted, { 'delete 200': (r) => r.status === 200 });

  sleep(2);
}

// ponytail: upload scenario — avatar + thumbnail uploads (10% of VUs).
export function upload(data) {
  const t = data.token;
  const cookie = authCookie(t);

  const created = mutate('projects:createProject', {
    name: `mix-upl-${__VU}-${__ITER}`,
    boardType: 'mega',
  }, t);
  const pid = created.json()?.projectId;

  if (pid) {
    const fd = {
      projectId: pid,
      thumbnail: http.file(PNG_BUFFER, 'test.png', 'image/png'),
    };
    const thumbRes = http.post(`${BASE}/api/upload/thumbnail`, fd, {
      headers: { Cookie: cookie, Origin: BASE },
    });
    check(thumbRes, { 'thumbnail 200': (r) => r.status === 200 });

    const deleted = mutate('projects:deleteProject', { projectId: pid }, t);
    check(deleted, { 'delete 200': (r) => r.status === 200 });
  }

  const avatarFd = {
    avatar: http.file(PNG_BUFFER, 'test.png', 'image/png'),
  };
  const avatarRes = http.post(`${BASE}/api/upload/avatar`, avatarFd, {
    headers: { Cookie: cookie, Origin: BASE },
  });
  check(avatarRes, { 'avatar 200': (r) => r.status === 200 });

  sleep(3);
}
