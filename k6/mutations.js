import { signIn, mutate, query } from './common.js';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    mutations: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    // ponytail: 5% tolerance — mutations hit rate limits and DB contention harder than reads.
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

export function setup() {
  return signIn();
}

export default function (data) {
  const t = data.token;

  const created = mutate('projects:createProject', {
    name: `mut-${__VU}-${__ITER}`,
    boardType: 'uno',
  }, t);
  if (!check(created, { 'create 200': (r) => r.status === 200 })) {
    sleep(1);
    return;
  }

  const projectId = created.json()?.projectId;
  if (!projectId) { sleep(1); return; }

  const updated = mutate('projects:updateProject', {
    projectId,
    name: `mut-${__VU}-${__ITER}-upd`,
  }, t);
  check(updated, { 'update 200': (r) => r.status === 200 });

  const saved = mutate('projects:saveProjectFile', {
    projectId,
    content: '<xml><block type="led"></block></xml>',
    filename: 'main.xml',
  }, t);
  check(saved, { 'saveFile 200': (r) => r.status === 200 });

  const got = query('projects:getProjectFile', { projectId }, t);
  check(got, { 'getFile 200': (r) => r.status === 200 });

  const starred = mutate('projects:starProject', { projectId }, t);
  check(starred, { 'star 200': (r) => r.status === 200 });

  const unstarred = mutate('projects:unstarProject', { projectId }, t);
  check(unstarred, { 'unstar 200': (r) => r.status === 200 });

  const trashed = mutate('projects:trashProject', { projectId }, t);
  check(trashed, { 'trash 200': (r) => r.status === 200 });

  const restored = mutate('projects:restoreProject', { projectId }, t);
  check(restored, { 'restore 200': (r) => r.status === 200 });

  const deleted = mutate('projects:deleteProject', { projectId }, t);
  check(deleted, { 'delete 200': (r) => r.status === 200 });

  sleep(1);
}
