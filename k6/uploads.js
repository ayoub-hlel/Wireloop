import { signIn, mutate, authCookie, BASE } from './common.js';
import http from 'k6/http';
import { check, sleep } from 'k6';

// ponytail: open() must be called at init stage — store buffer globally.
const PNG_PATH = `${__ENV.K6_FIXTURE_DIR || './fixtures'}/test.png`;
const PNG_BUFFER = open(PNG_PATH, 'b');

export const options = {
  scenarios: {
    uploads: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    // ponytail: 10% tolerance — uploads are slow by nature, R2 latency varies.
    http_req_failed: ['rate<0.10'],
  },
};

export function setup() {
  return signIn();
}

export default function (data) {
  const t = data.token;
  const cookie = authCookie(t);

  // ponytail: create a project first so thumbnail upload has a valid target.
  const created = mutate('projects:createProject', {
    name: `upl-${__VU}-${__ITER}-${Date.now()}`,
    boardType: 'uno',
  }, t);
  if (!check(created, { 'createProject 200': (r) => r.status === 200 })) {
    sleep(2);
    return;
  }
  const projectId = created.json()?.projectId;

  if (projectId) {
    // thumbnail upload — multipart, PNG only, field name 'thumbnail'
    const fd = {
      projectId: projectId,
      thumbnail: http.file(PNG_BUFFER, 'test.png', 'image/png'),
    };
    const thumbRes = http.post(`${BASE}/api/upload/thumbnail`, fd, {
      headers: { Cookie: cookie, Origin: BASE },
    });
    check(thumbRes, { 'thumbnail 200': (r) => r.status === 200 });

    // cleanup
    mutate('projects:deleteProject', { projectId }, t);
  }

  // avatar upload — multipart, field name 'avatar', accepts jpeg/png/webp
  const avatarFd = {
    avatar: http.file(PNG_BUFFER, 'test.png', 'image/png'),
  };
  const avatarRes = http.post(`${BASE}/api/upload/avatar`, avatarFd, {
    headers: { Cookie: cookie, Origin: BASE },
  });
  check(avatarRes, { 'avatar 200': (r) => r.status === 200 });

  sleep(2);
}
