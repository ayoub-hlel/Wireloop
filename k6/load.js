import { signIn, hitApp, mutate } from './common.js';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  return signIn();
}

export default function (data) {
  hitApp(data);

  // ponytail: mix in a write — createProject exercises the mutation path.
  const res = mutate('projects:createProject', {
    name: `load-${__VU}-${__ITER}`,
    boardType: 'uno',
  }, data.token);
  check(res, { 'create 200': (r) => r.status === 200 });
  sleep(1);
}
